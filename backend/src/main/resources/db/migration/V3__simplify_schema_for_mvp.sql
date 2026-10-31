-- Thêm cột sdt và cờ xóa mềm cho Users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Thêm cờ xóa mềm cho Vehicles
ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Thêm ghi chú và hạn trả cho Bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS expected_return_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS handover_notes TEXT,
    ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

-- Thêm tên bộ phận và lý do xóa lỗi cho Damage Detections
ALTER TABLE damage_detections
    ADD COLUMN IF NOT EXISTS part_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS override_reason VARCHAR(255);