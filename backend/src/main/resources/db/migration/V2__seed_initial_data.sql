-- 1. Tạo Role (Gán UUID cố định để bảng users liên kết khóa ngoại)
INSERT INTO roles (role_id, role_name, description) VALUES
                                                        ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Fleet Manager / Owner'),
                                                        ('22222222-2222-2222-2222-222222222222', 'STAFF', 'Field Staff');

-- 2. Tạo 1 tài khoản Staff mặc định (role_id trỏ đúng về UUID của role STAFF)
INSERT INTO users (user_id, role_id, name, email, password) VALUES
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Nguyen Van Staff', 'staff@autoclaim.com', '$2a$10$dummyhashedpassword');

-- 3. Tạo 4 chiếc xe (Bỏ cột vehicle_id để DB tự động sinh UUID)
INSERT INTO vehicles (license_plate, model, seats, status) VALUES
                                                               ('43A-123.45', 'Toyota Vios 2022', 5, 'AVAILABLE'),
                                                               ('43A-678.90', 'Honda City RS', 5, 'AVAILABLE'),
                                                               ('43A-555.66', 'Mitsubishi Xpander', 7, 'AVAILABLE'),
                                                               ('43A-999.88', 'Mazda 3 Luxury', 5, 'MAINTENANCE');