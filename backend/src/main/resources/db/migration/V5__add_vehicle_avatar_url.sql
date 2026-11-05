-- Lưu ảnh đại diện xe trên Cloud (S3/R2/MinIO) thay vì BYTEA
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
