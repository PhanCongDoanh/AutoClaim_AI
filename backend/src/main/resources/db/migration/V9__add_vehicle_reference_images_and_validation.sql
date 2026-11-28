-- ====================================================================
-- V9: Bảng lưu ảnh chuẩn 8 góc xe và các trường phục vụ kiểm định tiền xử lý (Pre-validation)
-- ====================================================================

CREATE TABLE vehicle_reference_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL,
    angle_code VARCHAR(50) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_reference_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    CONSTRAINT uq_vehicle_reference_angle UNIQUE(vehicle_id, angle_code)
);

CREATE INDEX idx_vehicle_reference_images_vehicle_id ON vehicle_reference_images(vehicle_id);

-- Thêm các trường metadata kiểm định vào bảng inspection_images
ALTER TABLE inspection_images
    ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS detected_angle VARCHAR(50),
    ADD COLUMN IF NOT EXISTS deviation_percent DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS alignment_reliable BOOLEAN,
    ADD COLUMN IF NOT EXISTS error_code VARCHAR(50);
