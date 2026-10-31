-- Kích hoạt extension để PostgreSQL tự động sinh UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG ROLES (Phân quyền)
CREATE TABLE roles (
                       role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       role_name VARCHAR(50) UNIQUE NOT NULL, -- 'ADMIN', 'STAFF'
                       description TEXT
);

-- 2. BẢNG USERS (Tài khoản nhân viên/quản lý)
CREATE TABLE users (
                       user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       role_id UUID NOT NULL,
                       name VARCHAR(100) NOT NULL,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 3. BẢNG VEHICLES (Quản lý xe và điều hướng 3 tab UI)
CREATE TABLE vehicles (
                          vehicle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          license_plate VARCHAR(20) UNIQUE NOT NULL,
                          model VARCHAR(100) NOT NULL,
                          seats INT DEFAULT 5,
                          status VARCHAR(50) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RENTED', 'MAINTENANCE'
                          avatar_data BYTEA, -- Lưu trực tiếp ảnh đại diện xe
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG RENTERS (Thông tin khách thuê)
CREATE TABLE renters (
                         renter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                         name VARCHAR(100) NOT NULL,
                         phone_number VARCHAR(20),
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG BOOKINGS (Đơn thuê xe)
CREATE TABLE bookings (
                          booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          vehicle_id UUID NOT NULL,
                          renter_id UUID NOT NULL,
                          created_by UUID NOT NULL, -- Nhân viên nào tạo đơn
                          status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          CONSTRAINT fk_booking_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
                          CONSTRAINT fk_booking_renter FOREIGN KEY (renter_id) REFERENCES renters(renter_id),
                          CONSTRAINT fk_booking_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 6. BẢNG INSPECTION SESSIONS (Phiên chụp ảnh kiểm tra)
CREATE TABLE inspection_sessions (
                                     session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     booking_id UUID NOT NULL,
                                     staff_id UUID NOT NULL,
                                     session_type VARCHAR(50) NOT NULL, -- 'CHECK_IN' hoặc 'CHECK_OUT'
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     CONSTRAINT fk_session_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
                                     CONSTRAINT fk_session_staff FOREIGN KEY (staff_id) REFERENCES users(user_id)
);

-- 7. BẢNG INSPECTION IMAGES (Lưu trực tiếp 10 ô ảnh)
CREATE TABLE inspection_images (
                                   image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                   session_id UUID NOT NULL,
                                   angle_code VARCHAR(50) NOT NULL, -- 'CCCD_FRONT', 'CCCD_BACK', 'ANGLE_1' -> 'ANGLE_8'
                                   image_data BYTEA NOT NULL, -- Lưu mã nhị phân của ảnh
                                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                   CONSTRAINT fk_image_session FOREIGN KEY (session_id) REFERENCES inspection_sessions(session_id)
);

-- 8. BẢNG DAMAGE DETECTIONS (Kết quả AI YOLOv8 & Ghi đè lỗi)
CREATE TABLE damage_detections (
                                   detection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                   image_id UUID NOT NULL, -- Lỗi này thuộc về bức ảnh Check-out nào
                                   damage_type VARCHAR(100) NOT NULL, -- 'Trầy xước', 'Móp méo'
                                   confidence_score FLOAT NOT NULL, -- VD: 0.89 (89%)
                                   bounding_box JSONB, -- Lưu tọa độ vẽ khung đỏ: {"x": 10, "y": 20, "w": 100, "h": 50}
                                   is_overridden BOOLEAN DEFAULT FALSE, -- TRUE nếu nhân viên bấm "Xóa (AI nhầm)"
                                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                   CONSTRAINT fk_damage_image FOREIGN KEY (image_id) REFERENCES inspection_images(image_id)
);