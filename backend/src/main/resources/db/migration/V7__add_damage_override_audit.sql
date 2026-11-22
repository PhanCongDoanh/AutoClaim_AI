-- Who rejected an AI detection as a false positive, and when (inspection history / dispute handling).
-- Rows overridden before this migration keep NULL in both columns.
ALTER TABLE damage_detections
    ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMP;

-- Accent-insensitive search in the inspection history ("nguyen" matches "Nguyễn", "do" matches "Đỗ").
CREATE EXTENSION IF NOT EXISTS unaccent;
