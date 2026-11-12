"""
AutoClaim AI service.

Hợp đồng với Spring Boot (InspectionServiceImpl.triggerAiDetection):
    POST /api/ai/detect   body: {"sessionId": "<uuid của phiên CHECK_OUT>"}
Service trả 202 NGAY, rồi xử lý nền:
    đọc DB -> tải 8 cặp ảnh -> phân tích -> ghi damage_detections (chỉ HƯ HẠI MỚI).

Theo dõi tiến độ:  GET /api/ai/status/{sessionId}
Chạy:  uvicorn app:app --host 0.0.0.0 --port 5000
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

load_dotenv(Path(__file__).with_name(".env"))

import db  # noqa: E402
from detector import DamageAnalyzer, decode_image  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("autoclaim-ai")

WEIGHTS_DIR = Path(__file__).with_name("weights")
DAMAGE_MODEL = os.getenv("DAMAGE_MODEL", str(WEIGHTS_DIR / "damage_best.pt"))
PART_MODEL = os.getenv("PART_MODEL", str(WEIGHTS_DIR / "parts_best.pt"))
WAIT_FOR_COMMIT_SEC = int(os.getenv("WAIT_FOR_COMMIT_SEC", 60))

analyzer: DamageAnalyzer | None = None
STATUS: dict[str, dict] = {}   # trạng thái trong RAM (đủ cho demo; có V6 thì ghi thêm vào DB)


class DetectRequest(BaseModel):
    sessionId: str


@asynccontextmanager
async def lifespan(_app):
    global analyzer
    log.info("Loading damage model %s | part model %s", DAMAGE_MODEL, PART_MODEL if os.path.exists(PART_MODEL) else "(none -> heuristic)")
    analyzer = DamageAnalyzer(DAMAGE_MODEL, PART_MODEL)
    log.info("Damage classes: %s", analyzer.damage_model.names)
    yield


app = FastAPI(title="AutoClaim AI Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "damageClasses": analyzer.damage_model.names if analyzer else None,
            "partModel": analyzer is not None and analyzer.part_model is not None}


@app.post("/api/ai/detect", status_code=202)
def detect(req: DetectRequest, bg: BackgroundTasks):
    STATUS[req.sessionId] = {"status": "QUEUED", "progress": 0,
                             "currentAngle": None, "completedAngles": [], "totalAngles": None}
    bg.add_task(process_session, req.sessionId)
    return {"sessionId": req.sessionId, "status": "QUEUED"}


@app.get("/api/ai/status/{session_id}")
def status(session_id: str):
    if session_id not in STATUS:
        raise HTTPException(404, "Unknown session")
    return STATUS[session_id]


# ----------------------------------------------------------------------------
def _download(url: str):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return decode_image(r.content)


def _box_iou(a: dict, b: dict) -> float:
    ax2, ay2, bx2, by2 = a["x"] + a["w"], a["y"] + a["h"], b["x"] + b["w"], b["y"] + b["h"]
    iw, ih = max(0.0, min(ax2, bx2) - max(a["x"], b["x"])), max(0.0, min(ay2, by2) - max(a["y"], b["y"]))
    inter = iw * ih
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def _wait_for_session(conn, session_id: str):
    """Backend gọi AI khi transaction check-out CHƯA commit -> đợi đến khi thấy đủ 8 ảnh."""
    deadline = time.time() + WAIT_FOR_COMMIT_SEC
    while time.time() < deadline:
        conn.rollback()  # bắt đầu snapshot mới để thấy dữ liệu vừa commit
        s = db.get_session(conn, session_id)
        if s and len(db.get_images(conn, s["session_id"])) >= 8:
            return s
        time.sleep(1)
    raise RuntimeError(f"Session {session_id} không có đủ 8 ảnh sau {WAIT_FOR_COMMIT_SEC}s")


def process_session(session_id: str):
    t0 = time.time()
    st = STATUS.setdefault(session_id, {})
    st.update(status="PROCESSING", progress=0, step="Đang chờ dữ liệu",
              currentAngle=None, completedAngles=[], totalAngles=None)
    try:
        with db.connect() as conn:
            s = _wait_for_session(conn, session_id)
            if s["session_type"] != "CHECK_OUT":
                raise RuntimeError("Chỉ phân tích phiên CHECK_OUT")
            db.set_ai_status(conn, s["session_id"], "PROCESSING")

            checkin_id = db.get_checkin_session_id(conn, s["booking_id"])
            if checkin_id is None:
                raise RuntimeError("Booking chưa có phiên CHECK_IN")
            after_imgs = db.get_images(conn, s["session_id"])
            before_imgs = db.get_images(conn, checkin_id)

            angles = sorted(after_imgs)
            st.update(totalAngles=len(angles))
            # Tải ảnh song song (I/O) cho nhanh
            urls = [u for a in angles for u in (before_imgs.get(a, {}).get("image_url"), after_imgs[a]["image_url"])]
            with ThreadPoolExecutor(8) as ex:
                imgs = list(ex.map(lambda u: _download(u) if u else None, urls))

            results = []
            for i, angle in enumerate(angles):
                st.update(progress=round(100 * i / len(angles)), step=f"Đang xử lý góc {i + 1}/{len(angles)} ({angle})",
                          currentAngle=angle)
                before, after = imgs[2 * i], imgs[2 * i + 1]
                if before is None:
                    log.warning("Thiếu ảnh check-in cho %s, bỏ qua", angle)
                    st["completedAngles"] = [*st["completedAngles"], angle]
                    continue
                results.append((angle, analyzer.analyze_pair(before, after, angle)))
                st["completedAngles"] = [*st["completedAngles"], angle]
            st.update(currentAngle=None)

            image_ids = [v["image_id"] for v in after_imgs.values()]
            overridden = db.get_overridden_boxes(conn, image_ids)
            db.delete_previous_ai_results(conn, image_ids)
            n_new = 0
            for angle, r in results:
                for d in r.new_damages:
                    if any(_box_iou(d.bbox_norm, ob) > 0.5 for ob in overridden.get(after_imgs[angle]["image_id"], [])):
                        continue  # nhân viên đã xác nhận đây là lỗi AI nhầm

                    box = {**d.bbox_norm, "normalized": True, "polygon": d.polygon_norm,
                           "matchIou": d.best_iou, "aligned": r.aligned}
                    db.insert_detection(conn, after_imgs[angle]["image_id"], d.damage_type, d.confidence, box, d.part_name)
                    n_new += 1
            conn.commit()
            db.set_ai_status(conn, s["session_id"], "DONE")

        summary = [{"angle": a, "aligned": r.aligned, "inliers": r.inliers,
                    "new": len(r.new_damages), "preExisting": len(r.old_damages)} for a, r in results]
        st.update(status="DONE", progress=100, step="Hoàn tất", newDamages=n_new,
                  seconds=round(time.time() - t0, 1), perAngle=summary)
        log.info("Session %s xong: %d hư hại mới trong %.1fs", session_id, n_new, time.time() - t0)
    except Exception as e:  # noqa: BLE001
        log.exception("AI xử lý lỗi cho session %s", session_id)
        st.update(status="FAILED", error=str(e), currentAngle=None)
        try:
            with db.connect() as conn:
                db.set_ai_status(conn, session_id, "FAILED")
        except Exception:  # noqa: BLE001
            pass
