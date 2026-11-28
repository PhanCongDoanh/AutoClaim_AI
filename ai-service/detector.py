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

    matcher = cv2.BFMatcher(cv2.NORM_L2)
    good = []
    for pair in matcher.knnMatch(d1, d2, k=2):
        if len(pair) == 2 and pair[0].distance < 0.75 * pair[1].distance:  # Lowe ratio test
            good.append(pair[0])
    if len(good) < MIN_INLIERS:
        return None, len(good)

    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    cv2.setRNGSeed(42)
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
        if before.shape == after.shape and np.array_equal(before, after):
            H, n_inl = np.eye(3, dtype=np.float64), 999
        else:
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


# ----------------------------------------------------------------------------
# STRICT 8-POINT PRE-VALIDATION & ALIGNMENT QUALITY GATE MODULE
# ----------------------------------------------------------------------------
MAX_DEVIATION_PERCENT = float(os.getenv("MAX_DEVIATION_PERCENT", 20.0))
MIN_RESOLUTION_PROD = int(os.getenv("MIN_RESOLUTION_PROD", 350))
MIN_SHORT_SIDE_DEV = int(os.getenv("MIN_SHORT_SIDE_DEV", 200))
MIN_LONG_SIDE_DEV = int(os.getenv("MIN_LONG_SIDE_DEV", 350))


def is_dev_test_env() -> bool:
    """Kiểm tra môi trường có phải là dev / test / local hay không."""
    env_mode = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "production")).strip().lower()
    return env_mode in ("dev", "development", "test", "testing", "local")


def is_allow_identical_checkout_image() -> bool:
    """Cho phép dùng cùng file BEFORE–AFTER tại cùng slot CHỈ trong chế độ dev/test khi cấu hình bật rõ ràng.
    Mặc định TẮT và KHÔNG THỂ bật khi APP_ENV là prod/production (hoặc chưa khai báo môi trường)."""
    if not is_dev_test_env():
        return False
    raw_flag = os.getenv("ALLOW_IDENTICAL_CHECKOUT_IMAGE", "false").strip().lower()
    return raw_flag in ("1", "true", "yes")

ANGLE_NAMES: dict[str, str] = {
    "ANGLE_1": "Đầu xe",
    "ANGLE_2": "Góc trước trái",
    "ANGLE_3": "Hông trái",
    "ANGLE_4": "Góc sau trái",
    "ANGLE_5": "Đuôi xe",
    "ANGLE_6": "Góc sau phải",
    "ANGLE_7": "Hông phải",
    "ANGLE_8": "Góc trước phải",
}

FRONT_PARTS = {"front_bumper", "hood", "front_glass", "front_light", "front_left_light", "front_right_light"}
REAR_PARTS = {"back_bumper", "trunk", "tailgate", "back_glass", "back_light", "back_left_light", "back_right_light"}
SIDE_PARTS = {"front_door", "back_door", "front_left_door", "front_right_door", "back_left_door", "back_right_door", "wheel"}


def compute_dhash(img: np.ndarray, hash_size: int = 8) -> str:
    """Tính mã băm nhận thức (difference hash 64-bit) để phát hiện ảnh trùng lặp thị giác."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    resized = cv2.resize(gray, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    decimal_value = 0
    hex_string = []
    for index, val in enumerate(diff.flatten()):
        if val:
            decimal_value += 1 << (index % 8)
        if (index % 8) == 7:
            hex_string.append(hex(decimal_value)[2:].rjust(2, "0"))
            decimal_value = 0
    return "".join(hex_string)


def dhash_distance(h1: str, h2: str) -> int:
    """Tính khoảng cách Hamming giữa 2 mã dHash."""
    try:
        n1 = int(h1, 16)
        n2 = int(h2, 16)
        return bin(n1 ^ n2).count("1")
    except Exception:
        return 64


def validate_image_quality(img: np.ndarray) -> dict:
    """Kiểm tra độ nét, độ sáng, tỉ lệ khung hình và độ phân giải tối thiểu."""
    if img is None or img.size == 0:
        return {
            "valid": False,
            "error_code": "INVALID_IMAGE",
            "message": "File ảnh không hợp lệ hoặc bị hỏng.",
            "blur_score": 0.0,
            "brightness": 0.0,
            "width": 0,
            "height": 0,
        }

    h, w = img.shape[:2]
    short_side = min(h, w)
    long_side = max(h, w)

    if is_dev_test_env():
        min_short = int(os.getenv("MIN_SHORT_SIDE_DEV", MIN_SHORT_SIDE_DEV))
        min_long = int(os.getenv("MIN_LONG_SIDE_DEV", MIN_LONG_SIDE_DEV))
        if short_side < min_short or long_side < min_long:
            return {
                "valid": False,
                "error_code": "LOW_RESOLUTION",
                "message": f"Độ phân giải ảnh quá thấp (yêu cầu tối thiểu cạnh ngắn {min_short}px, cạnh dài {min_long}px). Vui lòng chụp ảnh rõ nét hơn.",
                "blur_score": 0.0,
                "brightness": 0.0,
                "width": w,
                "height": h,
            }
    else:
        min_res = int(os.getenv("MIN_RESOLUTION_PROD", MIN_RESOLUTION_PROD))
        if short_side < min_res:
            return {
                "valid": False,
                "error_code": "LOW_RESOLUTION",
                "message": f"Độ phân giải ảnh quá thấp (tối thiểu {min_res}px). Vui lòng chụp ảnh rõ nét hơn.",
                "blur_score": 0.0,
                "brightness": 0.0,
                "width": w,
                "height": h,
            }

    aspect_ratio = max(h, w) / max(min(h, w), 1)
    if aspect_ratio > 3.5:
        return {
            "valid": False,
            "error_code": "INVALID_IMAGE",
            "message": "Tỉ lệ khung hình không hợp lệ hoặc ảnh bị cắt xén quá mức.",
            "blur_score": 0.0,
            "brightness": 0.0,
            "width": w,
            "height": h,
        }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    brightness = float(np.mean(gray))
    overexposed_ratio = float(np.mean(gray > 245))

    if brightness < 45.0:
        return {
            "valid": False,
            "error_code": "IMAGE_TOO_DARK",
            "message": "Ảnh quá tối, vui lòng bật đèn hoặc di chuyển ra nơi đủ sáng.",
            "blur_score": 0.0,
            "brightness": round(brightness, 2),
            "width": w,
            "height": h,
        }

    if brightness > 215.0 or overexposed_ratio > 0.35:
        return {
            "valid": False,
            "error_code": "IMAGE_TOO_BRIGHT",
            "message": "Ảnh quá chói hoặc bị lóa sáng, vui lòng điều chỉnh góc chụp.",
            "blur_score": 0.0,
            "brightness": round(brightness, 2),
            "width": w,
            "height": h,
        }

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_score < 65.0:
        return {
            "valid": False,
            "error_code": "IMAGE_TOO_BLURRY",
            "message": "Ảnh bị mờ hoặc rung tay, vui lòng giữ chắc máy và chụp lại.",
            "blur_score": round(blur_score, 2),
            "brightness": round(brightness, 2),
            "width": w,
            "height": h,
        }

    return {
        "valid": True,
        "error_code": None,
        "message": "Chất lượng ảnh đạt tiêu chuẩn.",
        "blur_score": round(blur_score, 2),
        "brightness": round(brightness, 2),
        "width": w,
        "height": h,
    }


def _mask_geom(
    mask: np.ndarray,
    vx1: int,
    vw: int,
    w: int,
    h: int,
) -> tuple[int, float | None, float | None, float | None, float, float]:
    """Tính diện tích, trọng tâm chuẩn hoá theo ảnh và theo silhouette xe, cùng độ phủ ngang."""
    ys, xs = np.nonzero(mask)
    area = int(xs.size)
    if area == 0:
        return 0, None, None, None, 0.0, 0.0
    mx = float(xs.mean())
    my = float(ys.mean())
    span = float(xs.max() - xs.min())
    return area, mx / w, my / h, (mx - vx1) / vw, span / vw, span / w


def classify_actual_viewpoint_from_parts(
    parts: list[Detection],
    shape_hw: tuple[int, int],
) -> tuple[str | None, float, str | None, str | None]:
    """Phân loại độc lập 8 góc xe từ danh sách bộ phận đã segment, bất biến với hư hỏng cục bộ."""
    h, w = shape_hw
    raw_valid = [p for p in parts if p.cls_name != "object"]
    if not raw_valid:
        return None, 0.0, "VEHICLE_NOT_DETECTED", None

    # Vùng cửa/bánh tin cậy cao để loại trừ mask cản/capo confidence thấp nhận nhầm trên thân cửa bị móp/xước
    m_side_hi = np.zeros((h, w), dtype=np.uint8)
    for p in raw_valid:
        if ("door" in p.cls_name and p.conf >= 0.30) or (p.cls_name == "wheel" and p.conf >= 0.45):
            m_side_hi |= p.mask
    side_hi_area = int(m_side_hi.sum())

    # Khử xung đột mask chồng lấn (giữ dự đoán tin cậy cao hơn rõ rệt)
    sorted_parts = sorted(raw_valid, key=lambda d: d.conf, reverse=True)
    valid_parts: list[Detection] = []
    for p in sorted_parts:
        p_is_f = p.cls_name in FRONT_PARTS
        p_is_r = p.cls_name in REAR_PARTS
        suppressed = False

        # 1a. Khử mask cản/capo/cốp confidence thấp đè lên vùng cửa/bánh xe bị trầy xước hoặc móp
        if p.cls_name in ("front_bumper", "back_bumper", "hood", "trunk", "tailgate") and p.conf < 0.42 and side_hi_area > 0:
            ov_side = int((p.mask & m_side_hi).sum())
            if ov_side / max(p.area, 1) > 0.22:
                suppressed = True

        # 1b. Khử mask cản trùng lớp nhưng rời rạc, confidence thấp hơn hẳn mask cản chính ở đầu/đuôi xe
        if not suppressed and p.cls_name in ("front_bumper", "back_bumper") and p.conf < 0.40:
            for kept in valid_parts:
                if kept.cls_name == p.cls_name and kept.conf >= p.conf + 0.28:
                    inter = int((p.mask & kept.mask).sum())
                    if inter / max(p.area, 1) < 0.10:
                        suppressed = True
                        break

        # 1c. Khử xung đột đầu/đuôi chồng lấn trên cùng một chi tiết
        if not suppressed and (p_is_f or p_is_r):
            for kept in valid_parts:
                k_is_f = kept.cls_name in FRONT_PARTS
                k_is_r = kept.cls_name in REAR_PARTS
                if (p_is_f and k_is_r) or (p_is_r and k_is_f):
                    inter = int((p.mask & kept.mask).sum())
                    union = int((p.mask | kept.mask).sum())
                    if union > 0 and (inter / union > 0.30 or inter / max(p.area, 1) > 0.50):
                        if kept.conf >= p.conf + 0.08:
                            suppressed = True
                            break
        if not suppressed:
            valid_parts.append(p)

    m_fb = np.zeros((h, w), dtype=np.uint8)
    m_hood = np.zeros((h, w), dtype=np.uint8)
    m_fg = np.zeros((h, w), dtype=np.uint8)
    m_fl = np.zeros((h, w), dtype=np.uint8)
    m_bb = np.zeros((h, w), dtype=np.uint8)
    m_trunk = np.zeros((h, w), dtype=np.uint8)
    m_bg = np.zeros((h, w), dtype=np.uint8)
    m_bl = np.zeros((h, w), dtype=np.uint8)
    m_door = np.zeros((h, w), dtype=np.uint8)
    m_mirror = np.zeros((h, w), dtype=np.uint8)
    m_wheel_all = np.zeros((h, w), dtype=np.uint8)
    m_fn_hi = np.zeros((h, w), dtype=np.uint8)
    m_rt_hi = np.zeros((h, w), dtype=np.uint8)
    wheel_dets: list[Detection] = []

    for p in valid_parts:
        c = p.cls_name
        pm = p.mask
        if c in ("front_bumper", "back_bumper", "hood", "trunk", "tailgate") and p.conf < 0.42 and side_hi_area > 0:
            pm = pm & (~m_side_hi)
        if c == "front_bumper":
            m_fb |= pm
            if p.conf >= 0.35:
                m_fn_hi |= pm
        elif c == "hood":
            m_hood |= pm
            if p.conf >= 0.35:
                m_fn_hi |= pm
        elif c == "front_glass":
            m_fg |= pm
        elif c in ("front_light", "front_left_light", "front_right_light"):
            m_fl |= pm
            if p.conf >= 0.35:
                m_fn_hi |= pm
        elif c == "back_bumper":
            m_bb |= pm
            if p.conf >= 0.35:
                m_rt_hi |= pm
        elif c in ("trunk", "tailgate"):
            m_trunk |= pm
            if p.conf >= 0.35:
                m_rt_hi |= pm
        elif c == "back_glass":
            m_bg |= pm
        elif c in ("back_light", "back_left_light", "back_right_light"):
            m_bl |= pm
            if p.conf >= 0.35:
                m_rt_hi |= pm
        elif "door" in c:
            m_door |= pm
        elif "mirror" in c:
            m_mirror |= pm
        elif c == "wheel":
            m_wheel_all |= pm
            wheel_dets.append(p)

    m_vehicle = m_fb | m_hood | m_fg | m_fl | m_bb | m_trunk | m_bg | m_bl | m_door | m_mirror | m_wheel_all
    vys, vxs = np.nonzero(m_vehicle)
    veh_area = int(vxs.size)
    if veh_area < max(800, int(0.012 * h * w)):
        return None, 0.0, "VEHICLE_NOT_DETECTED", None

    vx1, vx2 = int(vxs.min()), int(vxs.max())
    vy1, vy2 = int(vys.min()), int(vys.max())
    vw = max(vx2 - vx1, 1)
    vh = max(vy2 - vy1, 1)

    # Gộp các mask bánh xe trùng nhau (IoU > 0.40) và loại bỏ gờ lốp nhỏ dưới gầm cản chính diện
    merged_wheels: list[np.ndarray] = []
    for wd in sorted(wheel_dets, key=lambda d: d.conf, reverse=True):
        placed = False
        for i, mw in enumerate(merged_wheels):
            inter = int((wd.mask & mw).sum())
            union = int((wd.mask | mw).sum())
            if union > 0 and inter / union > 0.40:
                merged_wheels[i] = mw | wd.mask
                placed = True
                break
        if not placed:
            merged_wheels.append(wd.mask.copy())

    door_area = int(m_door.sum())
    m_lat_wheel = np.zeros((h, w), dtype=np.uint8)
    lat_wheel_cxs: list[float] = []
    for wm in merged_wheels:
        wys, wxs = np.nonzero(wm)
        wa_i = int(wxs.size)
        if wa_i == 0:
            continue
        w_cy_veh = (float(wys.mean()) - vy1) / vh
        if door_area < 0.02 * veh_area and wa_i < 0.042 * veh_area and w_cy_veh > 0.74:
            continue
        m_lat_wheel |= wm
        lat_wheel_cxs.append((float(wxs.mean()) - vx1) / vw)

    m_front_nose = m_fb | m_hood | m_fl
    m_front = m_front_nose | m_fg
    m_rear_tail = m_bb | m_trunk | m_bl
    m_rear = m_rear_tail | m_bg
    m_side = m_door | m_lat_wheel

    fa, f_cxi, _, f_cxv, f_spv, f_spi = _mask_geom(m_front, vx1, vw, w, h)
    fna, _, _, fn_cxv, _, _ = _mask_geom(m_front_nose, vx1, vw, w, h)
    fnh_a, _, _, fnh_cxv, _, _ = _mask_geom(m_fn_hi, vx1, vw, w, h)
    fga, _, _, fg_cxv, _, _ = _mask_geom(m_fg, vx1, vw, w, h)
    fla, _, _, _, _, fl_spi = _mask_geom(m_fl, vx1, vw, w, h)

    ra, r_cxi, _, r_cxv, r_spv, r_spi = _mask_geom(m_rear, vx1, vw, w, h)
    rta, _, _, rt_cxv, _, _ = _mask_geom(m_rear_tail, vx1, vw, w, h)
    rth_a, _, _, rth_cxv, _, _ = _mask_geom(m_rt_hi, vx1, vw, w, h)
    bga, _, _, bg_cxv, _, _ = _mask_geom(m_bg, vx1, vw, w, h)
    bla, _, _, _, _, bl_spi = _mask_geom(m_bl, vx1, vw, w, h)

    sa, _, _, s_cxv, _, _ = _mask_geom(m_side, vx1, vw, w, h)
    da, _, _, d_cxv, _, _ = _mask_geom(m_door, vx1, vw, w, h)
    wa, _, _, _, _, _ = _mask_geom(m_lat_wheel, vx1, vw, w, h)
    ma, _, _, m_cxv, m_spv, _ = _mask_geom(m_mirror, vx1, vw, w, h)

    fb_a = int(m_fb.sum())
    hood_a = int(m_hood.sum())
    bb_a = int(m_bb.sum())
    trunk_a = int(m_trunk.sum())
    wheel_all_a = int(m_wheel_all.sum())

    # Từ chối ảnh chụp quá gần (macro 1 chi tiết) hoặc thiếu cấu trúc hình học tổng thể của xe
    group_areas = [fb_a, hood_a, fga, fla, bb_a, trunk_a, bga, bla, da, wheel_all_a, ma]
    active_groups = sum(1 for a in group_areas if a >= 0.01 * veh_area)
    if active_groups <= 1:
        return None, 0.0, "VIEWPOINT_UNCERTAIN", None

    has_cabin_or_body = (hood_a + fga + trunk_a + bga + da) >= 0.03 * veh_area
    if not has_cabin_or_body:
        return None, 0.0, "VIEWPOINT_UNCERTAIN", None

    if da == 0 and fga == 0 and bga == 0 and trunk_a == 0:
        if fa > 0 and ra == 0 and hood_a < 0.08 * veh_area and fl_spi < 0.42:
            return None, 0.0, "VIEWPOINT_UNCERTAIN", None
        if ra > 0 and fa == 0 and trunk_a < 0.08 * veh_area and bl_spi < 0.42:
            return None, 0.0, "VIEWPOINT_UNCERTAIN", None

    tot = max(fa + ra + sa, 1)
    f_rat = fa / tot
    r_rat = ra / tot
    s_rat = sa / tot
    d_veh = da / veh_area
    w_veh = wa / veh_area
    s_veh = sa / veh_area

    # Bất biến hình chiếu ngang toàn thân (Pure Side Profile): thấy đồng thời mỏm đầu xe và mỏm đuôi xe ở 2 đầu đối diện với cửa ở giữa
    bilateral_side_profile = (
        d_veh >= 0.14
        and fnh_a >= 0.008 * veh_area
        and rth_a >= 0.008 * veh_area
        and fnh_cxv is not None
        and rth_cxv is not None
        and abs(fnh_cxv - rth_cxv) >= 0.55
    )

    if f_rat >= 0.22 and r_rat >= 0.22 and s_rat < 0.65 and not bilateral_side_profile:
        return None, 0.0, "VIEWPOINT_UNCERTAIN", None

    # Bỏ phiếu hướng đầu xe theo hệ toạ độ di chuyển của xe:
    # LEFT  = mũi xe hướng sang trái ảnh => nhìn thấy bên TRÁI xe (ANGLE_2, ANGLE_3, ANGLE_4)
    # RIGHT = mũi xe hướng sang phải ảnh => nhìn thấy bên PHẢI xe (ANGLE_8, ANGLE_7, ANGLE_6)
    left_score = 0.0
    right_score = 0.0

    if fna >= 0.015 * veh_area and sa >= 0.035 * veh_area and fn_cxv is not None and s_cxv is not None:
        diff = fn_cxv - s_cxv
        if diff < -0.07:
            left_score += 3.5
        elif diff > 0.07:
            right_score += 3.5

    if rta >= 0.015 * veh_area and sa >= 0.035 * veh_area and s_cxv is not None and rt_cxv is not None:
        diff = s_cxv - rt_cxv
        if diff < -0.07:
            left_score += 3.5
        elif diff > 0.07:
            right_score += 3.5

    if fna >= 0.01 * veh_area and rta >= 0.01 * veh_area and fn_cxv is not None and rt_cxv is not None:
        diff = fn_cxv - rt_cxv
        if diff < -0.15:
            left_score += 4.5
        elif diff > 0.15:
            right_score += 4.5

    if fna >= 0.04 * veh_area and fga >= 0.03 * veh_area and fn_cxv is not None and fg_cxv is not None:
        diff = fn_cxv - fg_cxv
        if diff < -0.075:
            left_score += 2.5
        elif diff > 0.075:
            right_score += 2.5

    if rta >= 0.04 * veh_area and bga >= 0.03 * veh_area and bg_cxv is not None and rt_cxv is not None:
        diff = bg_cxv - rt_cxv
        if diff < -0.045:
            left_score += 2.0
        elif diff > 0.045:
            right_score += 2.0

    if ma > 0 and da >= 0.06 * veh_area and m_spv < 0.30 and m_cxv is not None and d_cxv is not None:
        diff = m_cxv - d_cxv
        if diff < -0.05:
            left_score += 2.0
        elif diff > 0.05:
            right_score += 2.0

    if fga >= 0.015 * veh_area and bga >= 0.015 * veh_area and fg_cxv is not None and bg_cxv is not None:
        diff = fg_cxv - bg_cxv
        if diff < -0.12:
            left_score += 3.0
        elif diff > 0.12:
            right_score += 3.0

    non_glass_end = (fna + rta + ma) >= 0.008 * veh_area
    if (s_rat >= 0.68 or bilateral_side_profile) and non_glass_end:
        if fa >= 0.012 * veh_area and f_cxv is not None:
            if f_cxv < 0.32:
                left_score += 2.5
            elif f_cxv > 0.68:
                right_score += 2.5
        if ra >= 0.012 * veh_area and r_cxv is not None:
            if r_cxv > 0.68:
                left_score += 2.5
            elif r_cxv < 0.32:
                right_score += 2.5

    net = left_score - right_score
    conflict = min(left_score, right_score)
    head_dir: str | None = None
    if abs(net) >= 2.0 and abs(net) >= 2.0 * conflict:
        head_dir = "LEFT" if net > 0 else "RIGHT"

    shallow_side_cluster = (
        s_veh >= 0.04
        and wa >= 0.025 * veh_area
        and (da >= 0.015 * veh_area or (ma > 0 and m_spv < 0.25))
        and s_cxv is not None
        and (s_cxv < 0.22 or s_cxv > 0.78)
        and abs(net) >= 3.5
    )

    # 1. ANGLE_1 (Đầu xe - Trực diện trước)
    if f_rat >= 0.74 and r_rat < 0.05 and s_rat < 0.14 and d_veh < 0.04 and not shallow_side_cluster:
        front_struct_ok = (fb_a > 0 and (hood_a > 0 or fga > 0)) or (hood_a > 0 and fga > 0 and f_spi >= 0.50)
        centered_ok = f_cxi is not None and 0.30 <= f_cxi <= 0.70 and f_spv >= 0.75 and f_spi >= 0.40
        parallax_ok = True
        if fn_cxv is not None and fg_cxv is not None and fna >= 0.04 * veh_area and fga >= 0.03 * veh_area:
            parallax_ok = abs(fn_cxv - fg_cxv) < 0.11
        if front_struct_ok and centered_ok and parallax_ok:
            conf = min(0.98, round(0.80 + 0.18 * f_rat, 2))
            return "ANGLE_1", conf, None, ANGLE_NAMES["ANGLE_1"]

    # 2. ANGLE_5 (Đuôi xe - Trực diện sau)
    if r_rat >= 0.74 and f_rat < 0.05 and s_rat < 0.14 and d_veh < 0.04 and not shallow_side_cluster:
        rear_parts_n = sum(1 for a in (bb_a, trunk_a, bga) if a >= 0.02 * veh_area)
        centered_ok = r_cxi is not None and 0.30 <= r_cxi <= 0.70 and r_spv >= 0.75 and r_spi >= 0.40
        parallax_ok = True
        if rt_cxv is not None and bg_cxv is not None and rta >= 0.04 * veh_area and bga >= 0.03 * veh_area:
            parallax_ok = abs(bg_cxv - rt_cxv) < 0.11
        if rear_parts_n >= 2 and centered_ok and parallax_ok:
            conf = min(0.98, round(0.80 + 0.18 * r_rat, 2))
            return "ANGLE_5", conf, None, ANGLE_NAMES["ANGLE_5"]

    # 3. Hông xe thuần (ANGLE_3 - Hông trái vs ANGLE_7 - Hông phải)
    is_pure_side = (
        bilateral_side_profile
        or (s_rat >= 0.68 and f_rat < 0.20 and r_rat < 0.20 and (d_veh >= 0.12 or len(lat_wheel_cxs) >= 2))
        or (s_rat >= 0.74 and d_veh >= 0.32 and f_rat < 0.26 and r_rat < 0.26)
    )
    if is_pure_side:
        if head_dir == "LEFT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_3", conf, None, ANGLE_NAMES["ANGLE_3"]
        if head_dir == "RIGHT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_7", conf, None, ANGLE_NAMES["ANGLE_7"]

    # 4. Góc chéo trước (ANGLE_2 - Góc trước trái vs ANGLE_8 - Góc trước phải)
    has_front_diag_side = (
        s_rat >= 0.14
        or d_veh >= 0.04
        or shallow_side_cluster
        or (w_veh >= 0.05 and fn_cxv is not None and abs(fn_cxv - 0.5) >= 0.08)
    )
    if f_rat >= 0.16 and r_rat < 0.15 and has_front_diag_side:
        if head_dir == "LEFT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_2", conf, None, ANGLE_NAMES["ANGLE_2"]
        if head_dir == "RIGHT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_8", conf, None, ANGLE_NAMES["ANGLE_8"]

    # 5. Góc chéo sau (ANGLE_4 - Góc sau trái vs ANGLE_6 - Góc sau phải)
    has_rear_diag_side = (
        s_rat >= 0.14
        or d_veh >= 0.04
        or shallow_side_cluster
        or (w_veh >= 0.05 and rt_cxv is not None and abs(rt_cxv - 0.5) >= 0.08)
    )
    if r_rat >= 0.16 and f_rat < 0.15 and has_rear_diag_side:
        if head_dir == "LEFT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_4", conf, None, ANGLE_NAMES["ANGLE_4"]
        if head_dir == "RIGHT":
            conf = min(0.96, round(0.78 + 0.03 * abs(net), 2))
            return "ANGLE_6", conf, None, ANGLE_NAMES["ANGLE_6"]

    return None, 0.0, "VIEWPOINT_UNCERTAIN", None


def classify_actual_viewpoint(
    analyzer: DamageAnalyzer,
    img: np.ndarray,
) -> tuple[str | None, float, str | None, str | None]:
    """Phân loại góc chụp thực tế 8 góc độc lập dựa trên nhận diện bộ phận xe và phân bố hình học."""
    parts = analyzer._segment(analyzer.part_model, img, 0.20) if analyzer.part_model else []
    return classify_actual_viewpoint_from_parts(parts, img.shape[:2])


def validate_viewpoint(
    analyzer: DamageAnalyzer,
    img: np.ndarray,
    expected_angle: str,
    ref_img: np.ndarray | None = None,
) -> dict:
    """Xác minh góc chụp thực tế từ các bộ phận xe và đối chiếu tương quan."""
    expected_name = ANGLE_NAMES.get(expected_angle, expected_angle)

    detected_angle, score, error_code, detected_name = classify_actual_viewpoint(analyzer, img)

    if error_code == "VEHICLE_NOT_DETECTED":
        return {
            "verified": False,
            "matches_expected": False,
            "detected_angle": None,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "viewpoint_classifier",
            "error_code": "VEHICLE_NOT_DETECTED",
            "message": "Không phát hiện thấy xe hoặc bộ phận xe trong khung hình. Vui lòng chụp lại đúng góc xe.",
        }

    if detected_angle is None or error_code == "VIEWPOINT_UNCERTAIN":
        return {
            "verified": False,
            "matches_expected": False,
            "detected_angle": None,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "viewpoint_classifier",
            "error_code": "VIEWPOINT_UNCERTAIN",
            "message": "Không thể xác định chính xác góc chụp. Vui lòng chụp lại theo hướng dẫn.",
        }

    if detected_angle != expected_angle:
        return {
            "verified": True,
            "matches_expected": False,
            "detected_angle": detected_angle,
            "viewpoint_score": score,
            "viewpoint_score_type": "viewpoint_classifier",
            "error_code": "WRONG_VIEWPOINT",
            "message": f"Sai góc chụp: hệ thống nhận diện đây là {detected_name}, vui lòng chụp đúng {expected_name}.",
        }

    return {
        "verified": True,
        "matches_expected": True,
        "detected_angle": detected_angle,
        "viewpoint_score": score,
        "viewpoint_score_type": "viewpoint_classifier",
        "error_code": None,
        "message": f"Xác nhận đúng góc {expected_name}",
    }


def compute_alignment_and_deviation(
    before: np.ndarray,
    after: np.ndarray,
    analyzer: DamageAnalyzer,
    max_deviation: float = MAX_DEVIATION_PERCENT,
) -> dict:
    """Tính ma trận homography, kiểm tra tính hợp lệ hình học và đo độ lệch deviation_percent."""
    H, inl = align_before_to_after(before, after)
    if H is None or inl < MIN_INLIERS:
        return {
            "aligned": False,
            "alignment_reliable": False,
            "inliers": inl,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": max_deviation,
            "error_code": "ALIGNMENT_FAILED",
            "message": "Không thể căn chỉnh ảnh với ảnh đối chiếu. Vui lòng căn đúng khung hình theo ảnh mẫu.",
        }

    det = float(np.linalg.det(H[:2, :2]))
    if not (0.35 <= det <= 2.85):
        return {
            "aligned": True,
            "alignment_reliable": False,
            "inliers": inl,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": max_deviation,
            "error_code": "ALIGNMENT_UNRELIABLE",
            "message": "Phối cảnh chụp bị méo mó cực đoan so với ảnh đối chiếu. Vui lòng chụp lại theo đúng cự ly.",
        }

    hb, wb = before.shape[:2]
    ha, wa = after.shape[:2]

    # Kiểm tra phép chiếu 4 góc ảnh
    corners = np.float32([[0, 0], [wb, 0], [wb, hb], [0, hb]]).reshape(-1, 1, 2)
    warped_corners = cv2.perspectiveTransform(corners, H)
    if warped_corners is None or not cv2.isContourConvex(warped_corners.reshape(-1, 2).astype(np.int32)):
        return {
            "aligned": True,
            "alignment_reliable": False,
            "inliers": inl,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": max_deviation,
            "error_code": "ALIGNMENT_UNRELIABLE",
            "message": "Khung hình bị biến dạng phối cảnh không hợp lệ.",
        }

    parts_b = analyzer._segment(analyzer.part_model, before, 0.25) if analyzer.part_model else []
    parts_a = analyzer._segment(analyzer.part_model, after, 0.25) if analyzer.part_model else []

    # Khử nhận diện ảo/trùng lặp cho các bộ phận đơn lẻ (giữ lại detection có độ tin cậy cao nhất)
    # Tách biệt hình học xe với các vết xước/móp trên thân vỏ
    single_parts = {"front_bumper", "back_bumper", "hood", "front_glass", "back_glass", "trunk"}

    def _build_vehicle_mask(parts: list[Detection], h: int, w: int) -> np.ndarray:
        best_single: dict[str, Detection] = {}
        other_parts: list[Detection] = []
        for p in parts:
            if p.cls_name in single_parts:
                if p.cls_name not in best_single or p.conf > best_single[p.cls_name].conf:
                    best_single[p.cls_name] = p
            else:
                other_parts.append(p)
        mask = np.zeros((h, w), dtype=np.uint8)
        for p in list(best_single.values()) + other_parts:
            mask |= p.mask

        if mask.sum() < 0.02 * h * w:
            cv2.rectangle(mask, (int(0.15 * w), int(0.15 * h)), (int(0.85 * w), int(0.85 * h)), 1, -1)
        else:
            k = max(3, int(0.01 * max(h, w)) | 1)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask

    mb = _build_vehicle_mask(parts_b, hb, wb)
    ma = _build_vehicle_mask(parts_a, ha, wa)

    warped_b = cv2.warpPerspective(mb, H, (wa, ha), flags=cv2.INTER_NEAREST)
    inter = int(np.logical_and(ma, warped_b).sum())
    area_a = int(ma.sum())
    area_wb = int(warped_b.sum())

    cov_a = inter / max(area_a, 1)
    cov_b = inter / max(area_wb, 1)
    comparable_coverage = min(cov_a, cov_b)

    deviation_percent = round(100.0 * (1.0 - comparable_coverage), 2)
    comparable_coverage_percent = round(100.0 * comparable_coverage, 2)

    if deviation_percent <= max_deviation + 1e-6:
        return {
            "aligned": True,
            "alignment_reliable": True,
            "inliers": inl,
            "deviation_percent": deviation_percent,
            "comparable_coverage_percent": comparable_coverage_percent,
            "max_deviation_percent": max_deviation,
            "error_code": None,
            "message": "Căn chỉnh Before/After đạt tiêu chuẩn.",
        }

    return {
        "aligned": True,
        "alignment_reliable": True,
        "inliers": inl,
        "deviation_percent": deviation_percent,
        "comparable_coverage_percent": comparable_coverage_percent,
        "max_deviation_percent": max_deviation,
        "error_code": "EXCESSIVE_DEVIATION",
        "message": f"Ảnh chụp bị lệch góc hoặc sai khung hình quá 20% ({deviation_percent}%) so với ảnh đối chiếu, vui lòng căn chỉnh và chụp lại.",
    }


def validate_slot_pipeline(
    analyzer: DamageAnalyzer,
    image_bytes: bytes,
    reference_bytes: bytes | None = None,
    expected_angle: str = "",
    inspection_type: str = "CHECK_IN",
) -> dict:
    """Toàn bộ quy trình tiền kiểm định ảnh đầu vào (Strict Pre-validation Gate)."""
    expected_name = ANGLE_NAMES.get(expected_angle, expected_angle)

    if not image_bytes:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": None,
            "viewpoint_verified": False,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "heuristic",
            "quality_passed": False,
            "quality_details": None,
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": "INVALID_IMAGE",
            "message": "File ảnh rỗng hoặc không đọc được.",
        }

    is_checkout = inspection_type.upper() == "CHECK_OUT"

    if is_checkout and not reference_bytes:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": None,
            "viewpoint_verified": False,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "heuristic",
            "quality_passed": False,
            "quality_details": None,
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": "REFERENCE_IMAGE_MISSING",
            "message": f"Thiếu ảnh đối chiếu lúc giao xe cho góc {expected_name}.",
        }

    # 1. Kiểm tra tái sử dụng ảnh đối chiếu ở Check-out
    import hashlib
    img_sha256 = hashlib.sha256(image_bytes).hexdigest()

    if is_checkout and reference_bytes and not is_allow_identical_checkout_image():
        ref_sha256 = hashlib.sha256(reference_bytes).hexdigest()
        if img_sha256 == ref_sha256:
            return {
                "valid": False,
                "expected_angle": expected_angle,
                "detected_angle": expected_angle,
                "viewpoint_verified": True,
                "viewpoint_score": 1.0,
                "viewpoint_score_type": "exact_hash",
                "quality_passed": True,
                "quality_details": None,
                "aligned": True,
                "alignment_reliable": True,
                "inliers": 0,
                "deviation_percent": 0.0,
                "comparable_coverage_percent": 100.0,
                "max_deviation_percent": MAX_DEVIATION_PERCENT,
                "error_code": "REUSED_REFERENCE_IMAGE",
                "message": "Ảnh trả xe trùng hoàn toàn với ảnh nhận xe. Vui lòng chụp ảnh thực tế tại thời điểm trả xe.",
            }

    # 2. Giải mã ảnh
    try:
        cur_img = decode_image(image_bytes)
        ref_img = decode_image(reference_bytes) if (is_checkout and reference_bytes) else None
    except Exception as ex:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": None,
            "viewpoint_verified": False,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "heuristic",
            "quality_passed": False,
            "quality_details": None,
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": "INVALID_IMAGE",
            "message": f"Lỗi giải mã ảnh: {ex}",
        }

    # 3. Layer 1: Image Quality
    quality = validate_image_quality(cur_img)
    if not quality["valid"]:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": None,
            "viewpoint_verified": False,
            "viewpoint_score": 0.0,
            "viewpoint_score_type": "heuristic",
            "quality_passed": False,
            "quality_details": {
                "blur_score": quality["blur_score"],
                "brightness": quality["brightness"],
                "width": quality["width"],
                "height": quality["height"],
            },
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": quality["error_code"],
            "message": quality["message"],
        }

    # 4. Layer 2: Viewpoint
    viewpoint = validate_viewpoint(analyzer, cur_img, expected_angle, ref_img)
    if not viewpoint["verified"] or not viewpoint["matches_expected"]:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": viewpoint.get("detected_angle"),
            "viewpoint_verified": viewpoint["verified"],
            "viewpoint_score": viewpoint.get("viewpoint_score", 0.0),
            "viewpoint_score_type": viewpoint.get("viewpoint_score_type", "viewpoint_classifier"),
            "quality_passed": True,
            "quality_details": {
                "blur_score": quality["blur_score"],
                "brightness": quality["brightness"],
                "width": quality["width"],
                "height": quality["height"],
            },
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": viewpoint.get("error_code", "WRONG_VIEWPOINT"),
            "message": viewpoint.get("message", f"Sai góc chụp. Vui lòng chụp đúng {expected_name}."),
        }

    # Nếu là CHECK_IN: Không bắt buộc đối chiếu homography và không áp dụng ngưỡng lệch 20%
    if not is_checkout:
        return {
            "valid": True,
            "expected_angle": expected_angle,
            "detected_angle": viewpoint.get("detected_angle", expected_angle),
            "viewpoint_verified": True,
            "viewpoint_score": viewpoint.get("viewpoint_score", 0.95),
            "viewpoint_score_type": viewpoint.get("viewpoint_score_type", "viewpoint_classifier"),
            "quality_passed": True,
            "quality_details": {
                "blur_score": quality["blur_score"],
                "brightness": quality["brightness"],
                "width": quality["width"],
                "height": quality["height"],
            },
            "aligned": False,
            "alignment_reliable": False,
            "inliers": 0,
            "deviation_percent": None,
            "comparable_coverage_percent": None,
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": None,
            "message": "Đạt chuẩn",
        }

    # 5. Phase 3: Alignment & Deviation Gate (Dành riêng cho CHECK_OUT)
    alignment = compute_alignment_and_deviation(ref_img, cur_img, analyzer, MAX_DEVIATION_PERCENT)
    if not alignment["aligned"] or not alignment["alignment_reliable"] or alignment["error_code"] is not None:
        return {
            "valid": False,
            "expected_angle": expected_angle,
            "detected_angle": viewpoint.get("detected_angle", expected_angle),
            "viewpoint_verified": True,
            "viewpoint_score": viewpoint.get("viewpoint_score", 0.90),
            "viewpoint_score_type": viewpoint.get("viewpoint_score_type", "viewpoint_classifier"),
            "quality_passed": True,
            "quality_details": {
                "blur_score": quality["blur_score"],
                "brightness": quality["brightness"],
                "width": quality["width"],
                "height": quality["height"],
            },
            "aligned": alignment["aligned"],
            "alignment_reliable": alignment["alignment_reliable"],
            "inliers": alignment.get("inliers", 0),
            "deviation_percent": alignment.get("deviation_percent"),
            "comparable_coverage_percent": alignment.get("comparable_coverage_percent"),
            "max_deviation_percent": MAX_DEVIATION_PERCENT,
            "error_code": alignment["error_code"],
            "message": "Ảnh chụp chưa khớp với ảnh lúc giao xe. Vui lòng căn chỉnh và chụp lại.",
        }

    # Tất cả các điều kiện đều thỏa mãn cho Check-out
    return {
        "valid": True,
        "expected_angle": expected_angle,
        "detected_angle": viewpoint.get("detected_angle", expected_angle),
        "viewpoint_verified": True,
        "viewpoint_score": viewpoint.get("viewpoint_score", 0.95),
        "viewpoint_score_type": viewpoint.get("viewpoint_score_type", "viewpoint_classifier"),
        "quality_passed": True,
        "quality_details": {
            "blur_score": quality["blur_score"],
            "brightness": quality["brightness"],
            "width": quality["width"],
            "height": quality["height"],
        },
        "aligned": True,
        "alignment_reliable": True,
        "inliers": alignment.get("inliers", 0),
        "deviation_percent": alignment.get("deviation_percent"),
        "comparable_coverage_percent": alignment.get("comparable_coverage_percent"),
        "max_deviation_percent": MAX_DEVIATION_PERCENT,
        "error_code": None,
        "message": "Đạt chuẩn",
    }
