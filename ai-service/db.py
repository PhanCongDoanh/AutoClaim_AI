"""Truy cập PostgreSQL - khớp với schema Flyway V1-V5 (+ V6 tuỳ chọn: inspection_sessions.ai_status)."""
from __future__ import annotations

import json
import os
import uuid

import psycopg


def connect():
    # Dùng tham số rời thay vì URL vì mật khẩu có ký tự '@'
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "autoclaim_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        autocommit=False,
    )


def get_session(conn, session_id: str):
    row = conn.execute(
        "SELECT session_id, booking_id, session_type FROM inspection_sessions WHERE session_id = %s",
        (session_id,),
    ).fetchone()
    return None if row is None else {"session_id": row[0], "booking_id": row[1], "session_type": row[2]}


def get_checkin_session_id(conn, booking_id):
    row = conn.execute(
        """SELECT session_id FROM inspection_sessions
           WHERE booking_id = %s AND session_type = 'CHECK_IN'
           ORDER BY created_at DESC LIMIT 1""",
        (booking_id,),
    ).fetchone()
    return row[0] if row else None


def get_images(conn, session_id) -> dict[str, dict]:
    """angle_code -> {image_id, image_url}; chỉ lấy ANGLE_1..ANGLE_8 (bỏ CCCD)."""
    rows = conn.execute(
        "SELECT image_id, angle_code, image_url FROM inspection_images WHERE session_id = %s",
        (session_id,),
    ).fetchall()
    return {a: {"image_id": i, "image_url": u} for i, a, u in rows if a and a.startswith("ANGLE_")}


def delete_previous_ai_results(conn, image_ids: list):
    """Chạy lại AI cho cùng session -> xoá kết quả cũ (giữ lại các dòng nhân viên đã override)."""
    conn.execute(
        "DELETE FROM damage_detections WHERE image_id = ANY(%s) AND is_overridden IS NOT TRUE",
        (image_ids,),
    )


def get_overridden_boxes(conn, image_ids: list) -> dict:
    """image_id -> [bbox] của các vết nhân viên đã đánh dấu 'AI nhầm' (để không chèn lại khi chạy lại AI)."""
    out: dict = {}
    for image_id, box in conn.execute(
        "SELECT image_id, bounding_box FROM damage_detections WHERE image_id = ANY(%s) AND is_overridden IS TRUE",
        (image_ids,),
    ).fetchall():
        if box:
            out.setdefault(image_id, []).append(box)
    return out


def insert_detection(conn, image_id, damage_type: str, confidence: float, bounding_box: dict, part_name: str | None):
    conn.execute(
        """INSERT INTO damage_detections
               (detection_id, image_id, damage_type, confidence_score, bounding_box, part_name, is_overridden)
           VALUES (%s, %s, %s, %s, %s::jsonb, %s, FALSE)""",
        (uuid.uuid4(), image_id, damage_type, confidence, json.dumps(bounding_box), part_name),
    )


_has_ai_status: bool | None = None


def set_ai_status(conn, session_id, status: str):
    """Ghi trạng thái nếu đã chạy migration V6 (cột ai_status); chưa có thì bỏ qua."""
    global _has_ai_status
    if _has_ai_status is None:
        _has_ai_status = conn.execute(
            """SELECT 1 FROM information_schema.columns
               WHERE table_name = 'inspection_sessions' AND column_name = 'ai_status'"""
        ).fetchone() is not None
    if _has_ai_status:
        conn.execute("UPDATE inspection_sessions SET ai_status = %s WHERE session_id = %s", (status, session_id))
        conn.commit()
