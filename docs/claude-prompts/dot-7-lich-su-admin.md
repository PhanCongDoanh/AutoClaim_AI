# Đợt 7 – Lịch sử kiểm định cho Admin (giám sát + chống gian lận)

Đọc `CLAUDE.md`, `docs/claude-prompts/dot-6-lich-su-kiem-dinh.md` và code đợt 6 (trang Lịch sử của Staff).
Lập kế hoạch, liệt kê file → **chờ tôi OK** → làm. Không có mockup riêng: dùng lại thiết kế `S1`/`S3` (đợt 6) + các bổ sung dưới đây.

## Mục tiêu
Admin xem được toàn bộ lịch sử kiểm định như Staff, **cộng thêm** công cụ giám sát:
1. Lọc theo nhân viên và lọc các lượt có lỗi AI bị loại → phát hiện việc lạm dụng nút "Xoá (AI nhầm)" (chống gian lận nội bộ).
2. Thẻ tổng hợp: tỷ lệ xe có hư hại, **tỷ lệ lỗi AI bị nhân viên loại bỏ** (thước đo độ chính xác AI trên dữ liệu thật).
Trang **chỉ xem**, admin không sửa/override gì.

## Nguyên tắc: dùng chung, không nhân bản
- Chuyển các component/hook lịch sử của đợt 6 sang chỗ dùng chung (vd `components/history/` + `hooks/`), nhận cấu hình qua props
  (đường dẫn gốc `/staff/history` | `/admin/history`, có/không cột & bộ lọc dành cho admin). Trang Staff giữ nguyên giao diện và hành vi.
- Backend: mở rộng `InspectionHistoryRepository`/`InspectionHistoryService` bằng điều kiện tuỳ chọn, **không** viết bản SQL thứ hai.

## Backend
1. `GET /api/admin/inspections/history` – cùng tham số và định dạng trang như `/api/inspections/history`, thêm:
   - `staffId` (UUID, tuỳ chọn): lọc theo **nhân viên nhận lại xe** (nhân viên của phiên CHECK_OUT – người duyệt kết quả AI).
   - `hasOverride` (boolean, tuỳ chọn): `true` → chỉ các lượt có ≥ 1 lỗi AI bị loại.
   - Mỗi dòng thêm `checkOutStaffName`, `checkInStaffName`.
2. `GET /api/admin/inspections/history/summary` – cùng bộ lọc `search`, `month`, `staffId` (bỏ qua `result`, `hasOverride`
   để thẻ luôn cho cái nhìn tổng quát trong phạm vi đang xem):
   ```json
   { "totalReturns": 46, "damagedReturns": 18, "cleanReturns": 28,
     "aiDetections": 61, "overriddenDetections": 7, "overrideRate": 0.115 }
   ```
   `aiDetections` = tổng hư hại AI phát hiện (gồm cả đã loại); `overrideRate` = `overriddenDetections / aiDetections` (0 nếu không có).
   Một truy vấn gộp, không N+1.
3. Dropdown nhân viên dùng lại `GET /api/admin/staff` hiện có (kiểm tra trường trả về đủ id + họ tên).
4. Endpoint đặt dưới `/api/admin/...` cho rõ ràng; giữ nguyên cơ chế bảo mật hiện tại (JWT không chặn – ngoài phạm vi, đã ghi vào hạn chế).

## Frontend
1. **Header của Admin**: thêm mục "Lịch sử kiểm định" cạnh các mục admin hiện có. Route `/admin/history` và
   `/admin/history/:checkOutSessionId` trong nhánh `ProtectedRoute allowedRoles={['ADMIN']}`.
2. **Danh sách (`/admin/history`)** – như trang Staff, thêm:
   - **4 thẻ tổng hợp** phía trên bảng (theo bộ lọc hiện tại): "Lượt trả xe" · "Có hư hại" (số + %) · "Không hư hại" ·
     "Lỗi AI bị loại" (`overriddenDetections/aiDetections`, kèm % – chú thích nhỏ "tỷ lệ AI báo nhầm theo xác nhận của nhân viên").
   - Bộ lọc thêm: dropdown **"Nhân viên: Tất cả / <tên>"** và lựa chọn **"Có lỗi AI bị loại"** (thêm vào dropdown Kết quả hoặc công tắc riêng – chọn cách gọn nhất).
   - Cột thêm **"NV nhận lại xe"**; badge kết quả thêm ghi chú "m lỗi đã loại" (hiện rõ, không chỉ tooltip) khi m > 0.
   - Bộ lọc + trang lưu trên URL như đợt 6 (thêm `staff`, `override`).
3. **Chi tiết (`/admin/history/:id`)** – dùng chung trang chi tiết đợt 6 (ảnh 8 góc, kết quả AI, lỗi đã loại kèm lý do · người loại · thời gian,
   CCCD ẩn mặc định, ghi chú, tải PDF); "← Quay lại" về `/admin/history` giữ bộ lọc. Không có nút thao tác.
   Nếu sau này có `IntegrityCheckPanel` (đợt SHA-256) thì nó nằm trong component chi tiết dùng chung → tự có ở cả hai bên.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
1. Rebuild `api`. Đăng nhập admin → mục "Lịch sử kiểm định" hiện trên header; đăng nhập staff → không thấy thẻ tổng hợp/bộ lọc nhân viên.
2. Có ít nhất 2 nhân viên từng check-out (tạo thêm tài khoản staff qua trang Nhân viên nếu cần), ít nhất 1 lượt có lỗi bị loại.
3. Lọc theo từng nhân viên, lọc "Có lỗi AI bị loại" → đúng các lượt; thẻ tổng hợp đổi theo nhân viên/tháng; tỷ lệ tính đúng (đối chiếu tay).
4. Chi tiết từ trang admin → Quay lại giữ bộ lọc.
5. **Hồi quy trang Staff**: Lịch sử của Staff vẫn chạy như đợt 6 (danh sách, lọc, chi tiết).
`npm run build`, `npm run lint`, `./mvnw -q -DskipTests package` sạch.
