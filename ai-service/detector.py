"""
AutoClaim AI - Lõi phân tích Before/After cho Check-out.

Pipeline cho MỖI cặp ảnh cùng góc (check-in vs check-out):
  1. Chạy model hư hại (YOLOv8-seg) trên cả 2 ảnh.
       - Ảnh BEFORE dùng ngưỡng conf THẤP  -> bắt được cả vết cũ mờ  -> ít báo nhầm "lỗi mới".
       - Ảnh AFTER  dùng ngưỡng conf CAO   -> chỉ báo vết AI khá chắc chắn.
  2. Căn chỉnh ảnh BEFORE sang hệ toạ độ ảnh AFTER: SIFT + RANSAC Homography.
  3. Chiếu (warp) mask hư hại của BEFORE sang AFTER, nới rộng (dilate) để bù sai số căn chỉnh.
  4. Với mỗi vết ở AFTER: nếu trùng vết cũ (IoU >= IOU_THR hoặc bị phủ >= CONTAIN_THR)
       -> "đã có từ trước", ngược lại -> "HƯ HẠI MỚI".
  5. Xác định bộ phận xe: model car-parts (nếu có) hoặc heuristic theo góc chụp + vị trí.
"""
from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field

import cv2
import numpy as np


# ----------------------------------------------------------------------------
# Cấu hình (đổi qua biến môi trường, không cần sửa code)
# ----------------------------------------------------------------------------
def _f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


MAX_SIDE = int(os.getenv("MAX_SIDE", 1280))          # thu nhỏ ảnh điện thoại (4000px) cho nhanh
IMGSZ = int(os.getenv("IMGSZ", 640))                 # kích thước đưa vào YOLO (= lúc train)
CONF_AFTER = _f("CONF_AFTER", 0.35)                  # ngưỡng tin cậy ảnh trả xe
CONF_BEFORE = _f("CONF_BEFORE", 0.15)                # ngưỡng tin cậy ảnh nhận xe (cố tình thấp)
IOU_THR = _f("IOU_THR", 0.6)                         # theo đề xuất: IoU > 0.6 => lỗi cũ
CONTAIN_THR = _f("CONTAIN_THR", 0.5)                 # vết mới bị vết cũ phủ >= 50% => lỗi cũ
MIN_AREA_RATIO = _f("MIN_AREA_RATIO", 0.0004)        # bỏ vết quá nhỏ (nhiễu)
MIN_INLIERS = int(os.getenv("MIN_INLIERS", 25))      # số điểm khớp tối thiểu để tin homography
DILATE_RATIO = _f("DILATE_RATIO", 0.012)             # nới mask cũ ~1.2% đường chéo ảnh
CLASS_AGNOSTIC_MATCH = os.getenv("CLASS_AGNOSTIC_MATCH", "1") == "1"  # xước cũ bị nhận là móp vẫn tính là cũ


# ----------------------------------------------------------------------------
# Kiểu dữ liệu
# ----------------------------------------------------------------------------
@dataclass
class Detection:
    cls_name: str
    conf: float
    polygon: np.ndarray            # (N,2) float, toạ độ pixel của ảnh đã resize
    mask: np.ndarray               # (H,W) uint8 0/1
    area: int


@dataclass
class DamageResult:
    damage_type: str
    confidence: float
    part_name: str | None
    bbox_norm: dict                # {"x","y","w","h"} đã chuẩn hoá 0..1
    polygon_norm: list             # [[x,y],...] 0..1
    is_new: bool
    best_iou: float
    best_contain: float


@dataclass
class PairResult:
    angle_code: str
    aligned: bool
    inliers: int
    new_damages: list[DamageResult] = field(default_factory=list)
    old_damages: list[DamageResult] = field(default_factory=list)


# ----------------------------------------------------------------------------
# Tiện ích ảnh
# ----------------------------------------------------------------------------
def resize_max_side(img: np.ndarray, max_side: int = MAX_SIDE) -> np.ndarray:
    h, w = img.shape[:2]
    s = max_side / max(h, w)
    if s >= 1:
        return img
    return cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)


def decode_image(data: bytes) -> np.ndarray:
    """Đọc bytes -> ảnh BGR, có xử lý xoay EXIF của ảnh điện thoại."""
    from io import BytesIO
    from PIL import Image, ImageOps

    pil = ImageOps.exif_transpose(Image.open(BytesIO(data))).convert("RGB")
    return resize_max_side(cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR))


def normalize_name(name: str) -> str:
    return name.strip().lower().replace(" ", "_").replace("-", "_")


# ----------------------------------------------------------------------------
# Căn chỉnh ảnh (SIFT + RANSAC Homography)
# ----------------------------------------------------------------------------
def align_before_to_after(before: np.ndarray, after: np.ndarray):
    """Trả về (H, n_inliers). H ánh xạ toạ độ BEFORE -> AFTER, None nếu thất bại."""
    g1 = cv2.cvtColor(before, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(after, cv2.COLOR_BGR2GRAY)
    sift = cv2.SIFT_create(nfeatures=4000)
    k1, d1 = sift.detectAndCompute(g1, None)
    k2, d2 = sift.detectAndCompute(g2, None)
    if d1 is None or d2 is None or len(k1) < 10 or len(k2) < 10:
        return None, 0

    matcher = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 5}, {"checks": 50})
    good = []
    for pair in matcher.knnMatch(d1, d2, k=2):
        if len(pair) == 2 and pair[0].distance < 0.75 * pair[1].distance:  # Lowe ratio test
            good.append(pair[0])
    if len(good) < MIN_INLIERS:
        return None, len(good)

    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    n_inl = int(inl.sum()) if inl is not None else 0
    if H is None or n_inl < MIN_INLIERS:
        return None, n_inl

    # Loại homography "điên" (lật ảnh, co giãn quá mức) -> coi như thất bại
    det = np.linalg.det(H[:2, :2])
    if not (0.3 < det < 3.0):
        return None, n_inl
    return H, n_inl


def fallback_transform(before: np.ndarray, after: np.ndarray) -> np.ndarray:
    """Khi không căn chỉnh được: giả định 2 ảnh cùng khung hình, chỉ co giãn kích thước."""
    hb, wb = before.shape[:2]
    ha, wa = after.shape[:2]
    return np.array([[wa / wb, 0, 0], [0, ha / hb, 0], [0, 0, 1]], dtype=np.float64)


# ----------------------------------------------------------------------------
# Định vị bộ phận xe
# ----------------------------------------------------------------------------
# Tên lớp của dataset Ultralytics "carparts-seg" -> tiếng Việt (tên lạ giữ nguyên)
PART_VI = {
    "front_bumper": "Cản trước", "back_bumper": "Cản sau", "hood": "Nắp capo",
    "front_glass": "Kính lái", "back_glass": "Kính sau", "trunk": "Cốp sau", "tailgate": "Cửa cốp",
    "front_door": "Cửa trước", "back_door": "Cửa sau",
    "front_left_door": "Cửa trước trái", "front_right_door": "Cửa trước phải",
    "back_left_door": "Cửa sau trái", "back_right_door": "Cửa sau phải",
    "front_light": "Đèn trước", "back_light": "Đèn sau",
    "front_left_light": "Đèn trước trái", "front_right_light": "Đèn trước phải",
    "back_left_light": "Đèn sau trái", "back_right_light": "Đèn sau phải",
    "left_mirror": "Gương trái", "right_mirror": "Gương phải", "wheel": "Bánh xe",
}

# Phía của xe nhìn thấy ở mỗi góc (theo photoAngles.ts: đi theo chiều kim đồng hồ từ đầu xe)
ANGLE_SIDE = {
    "ANGLE_1": "", "ANGLE_2": "trái", "ANGLE_3": "trái", "ANGLE_4": "trái",
    "ANGLE_5": "", "ANGLE_6": "phải", "ANGLE_7": "phải", "ANGLE_8": "phải",
}


def visible_side(angle: str, cx: float) -> str:
    """Phía của XE mà vết nằm trên đó, suy ra từ góc chụp (đáng tin hơn model bộ phận:
    model train với lật ngang ảnh nên hay nhầm trái/phải).
    Góc 2,3,4 chỉ thấy bên trái; 6,7,8 chỉ thấy bên phải.
    Đầu xe (ANGLE_1): đứng trước xe nhìn vào -> bên TRÁI của xe nằm ở nửa PHẢI ảnh.
    Đuôi xe (ANGLE_5): đứng sau xe nhìn vào -> bên TRÁI của xe nằm ở nửa TRÁI ảnh."""
    side = ANGLE_SIDE.get(angle, "")
    if side:
        return side
    if angle == "ANGLE_1":
        return "trái" if cx > 0.5 else "phải"
    if angle == "ANGLE_5":
        return "trái" if cx < 0.5 else "phải"
    return ""


# Lớp bộ phận có phân biệt trái/phải (lớp không có trong danh sách và không chứa left/right thì giữ nguyên)
SIDED_GENERIC = {"front_door", "back_door", "front_light", "back_light", "wheel"}


def heuristic_part(angle: str, cx: float, cy: float) -> str:
    """Đoán bộ phận theo góc chụp + vị trí tâm vết (cx, cy chuẩn hoá 0..1). Dùng khi chưa có model bộ phận."""
    side = ANGLE_SIDE.get(angle, "")
    if angle == "ANGLE_1":
        return "Kính lái" if cy < 0.4 else ("Nắp capo" if cy < 0.6 else "Cản trước")
    if angle == "ANGLE_5":
        return "Kính sau" if cy < 0.4 else ("Cốp sau" if cy < 0.6 else "Cản sau")
    if angle in ("ANGLE_3", "ANGLE_7"):
        # Đứng bên TRÁI xe nhìn vào: đầu xe ở bên trái ảnh; bên PHẢI xe: đầu xe ở bên phải ảnh
        t = cx if angle == "ANGLE_3" else 1 - cx      # 0 = đầu xe, 1 = đuôi xe
        if cy > 0.75:
            return f"Bánh/la-zăng {side}"
        name = ("Vè trước" if t < 0.25 else "Cửa trước" if t < 0.5 else "Cửa sau" if t < 0.75 else "Vè sau")
        return f"{name} {side}"
    if angle in ("ANGLE_2", "ANGLE_8"):
        return f"Khu vực trước {side} (cản/vè/đèn)"
    if angle in ("ANGLE_4", "ANGLE_6"):
        return f"Khu vực sau {side} (cản/vè/đèn)"
    return None


# ----------------------------------------------------------------------------
# Bộ phân tích chính
# ----------------------------------------------------------------------------
class DamageAnalyzer:
    def __init__(self, damage_weights: str, part_weights: str | None = None, device: str | None = None):
        from ultralytics import YOLO

        self.device = device or os.getenv("DEVICE", "cpu")
        self.damage_model = YOLO(damage_weights)
        self.part_model = YOLO(part_weights) if part_weights and os.path.exists(part_weights) else None
        self._lock = threading.Lock()   # YOLO không thread-safe

    # ---- suy luận ----
    def _segment(self, model, img: np.ndarray, conf: float) -> list[Detection]:
        h, w = img.shape[:2]
        with self._lock:
            r = model.predict(img, imgsz=IMGSZ, conf=conf, device=self.device, verbose=False, retina_masks=False)[0]
        out: list[Detection] = []
        if r.masks is None:
            return out
        for poly, c, cls in zip(r.masks.xy, r.boxes.conf.tolist(), r.boxes.cls.tolist()):
            if len(poly) < 3:
                continue
            mask = np.zeros((h, w), np.uint8)
            cv2.fillPoly(mask, [poly.astype(np.int32)], 1)
            area = int(mask.sum())
            if area < MIN_AREA_RATIO * h * w:
                continue
            out.append(Detection(normalize_name(model.names[int(cls)]), float(c), poly, mask, area))
        return out

    def detect_damage(self, img, conf):
        return self._segment(self.damage_model, img, conf)

    # ---- bộ phận ----
    def _part_name(self, det: Detection, angle: str, parts: list[Detection] | None, w: int, h: int):
        if parts:
            best, best_ov = None, 0
            for p in parts:
                ov = int((det.mask & p.mask).sum())
                if ov > best_ov and p.cls_name not in ("object",):
                    best, best_ov = p, ov
            if best is not None and best_ov > 0.2 * det.area:
                cls = best.cls_name
                name = PART_VI.get(cls, cls)
                if "left" in cls or "right" in cls or cls in SIDED_GENERIC:
                    # Bỏ trái/phải do model đoán, thay bằng phía suy ra từ góc chụp
                    base = name.replace(" trái", "").replace(" phải", "").strip()
                    x, _, bw, _ = cv2.boundingRect(det.polygon.astype(np.int32))
                    side = visible_side(angle, (x + bw / 2) / w)
                    name = f"{base} {side}".strip()
                return name
        x, y, bw, bh = cv2.boundingRect(det.polygon.astype(np.int32))
        return heuristic_part(angle, (x + bw / 2) / w, (y + bh / 2) / h)

    # ---- phân tích 1 cặp ảnh ----
    def analyze_pair(self, before: np.ndarray, after: np.ndarray, angle: str) -> PairResult:
        ha, wa = after.shape[:2]
        dets_after = self.detect_damage(after, CONF_AFTER)
        res = PairResult(angle_code=angle, aligned=False, inliers=0)
        if not dets_after:
            return res                       # ảnh trả xe sạch -> khỏi tốn công căn chỉnh

        dets_before = self.detect_damage(before, CONF_BEFORE)
        H, n_inl = align_before_to_after(before, after)
        res.aligned, res.inliers = H is not None, n_inl
        if H is None:
            H = fallback_transform(before, after)

        # Chiếu mask cũ sang toạ độ ảnh trả xe + nới rộng để bù sai số
        k = max(3, int(DILATE_RATIO * np.hypot(wa, ha)) | 1)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        warped_before = [
            (d.cls_name, cv2.dilate(cv2.warpPerspective(d.mask, H, (wa, ha), flags=cv2.INTER_NEAREST), kernel))
            for d in dets_before
        ]

        parts = self._segment(self.part_model, after, 0.25) if self.part_model else None

        for d in dets_after:
            best_iou = best_contain = 0.0
            for cls_b, mb in warped_before:
                if not CLASS_AGNOSTIC_MATCH and cls_b != d.cls_name:
                    continue
                inter = int((d.mask & mb).sum())
                if inter == 0:
                    continue
                union = int((d.mask | mb).sum())
                best_iou = max(best_iou, inter / union)
                best_contain = max(best_contain, inter / d.area)
            is_new = not (best_iou >= IOU_THR or best_contain >= CONTAIN_THR)

            x, y, bw, bh = cv2.boundingRect(d.polygon.astype(np.int32))
            poly = d.polygon
            if len(poly) > 40:   # rút gọn polygon cho nhẹ JSON
                poly = cv2.approxPolyDP(poly.astype(np.float32).reshape(-1, 1, 2), 1.5, True).reshape(-1, 2)
            item = DamageResult(
                damage_type=d.cls_name,
                confidence=round(d.conf, 4),
                part_name=self._part_name(d, angle, parts, wa, ha),
                bbox_norm={"x": round(x / wa, 4), "y": round(y / ha, 4), "w": round(bw / wa, 4), "h": round(bh / ha, 4)},
                polygon_norm=[[round(float(px) / wa, 4), round(float(py) / ha, 4)] for px, py in poly],
                is_new=is_new,
                best_iou=round(best_iou, 3),
                best_contain=round(best_contain, 3),
            )
            (res.new_damages if is_new else res.old_damages).append(item)
        return res


# ----------------------------------------------------------------------------
# Vẽ kết quả (dùng cho test, báo cáo, slide)
# ----------------------------------------------------------------------------
def draw_pair(before: np.ndarray, after: np.ndarray, res: PairResult) -> np.ndarray:
    ha, wa = after.shape[:2]
    b = cv2.resize(before, (round(before.shape[1] * ha / before.shape[0]), ha))
    vis = after.copy()
    for items, color, tag in ((res.old_damages, (60, 180, 60), "CU"), (res.new_damages, (40, 40, 230), "MOI")):
        for it in items:
            pts = (np.array(it.polygon_norm) * [wa, ha]).astype(np.int32)
            overlay = vis.copy()
            cv2.fillPoly(overlay, [pts], color)
            vis = cv2.addWeighted(overlay, 0.35, vis, 0.65, 0)
            cv2.polylines(vis, [pts], True, color, 2)
            x, y = int(it.bbox_norm["x"] * wa), int(it.bbox_norm["y"] * ha)
            label = f"{tag} {it.damage_type} {it.confidence:.0%}"
            cv2.putText(vis, label, (x, max(18, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    canvas = np.hstack([b, np.full((ha, 8, 3), 255, np.uint8), vis])
    info = f"{res.angle_code} | aligned={res.aligned} inliers={res.inliers} | moi={len(res.new_damages)} cu={len(res.old_damages)}"
    cv2.putText(canvas, info, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
    cv2.putText(canvas, info, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    return canvas
