-- Trạng thái xử lý AI của phiên CHECK_OUT: PENDING | PROCESSING | DONE | FAILED
-- Đặt file vào backend/src/main/resources/db/migration/
ALTER TABLE inspection_sessions
    ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20);
