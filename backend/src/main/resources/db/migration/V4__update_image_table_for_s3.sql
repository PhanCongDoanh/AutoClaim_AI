-- Xóa cột lưu dữ liệu nhị phân nặng nề
ALTER TABLE inspection_images DROP COLUMN IF EXISTS image_data;

-- Thêm cột lưu đường link URL của ảnh trên Cloud (S3/R2/MinIO)
ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);