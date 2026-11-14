# Đợt 2 – Frontend luồng 1: trả xe KHÔNG hư hại

Đọc `CLAUDE.md`, `BAO-CAO-DOT-0.md`, và xem mockup `06` → `10` trong `docs/ui-mockups/`.
Backend đợt 1 đã xong (có `aiStatus`, `GET /ai-progress`, `POST /ai-retry`). Lập kế hoạch → **chờ tôi OK** → làm.

Giữ trạng thái trên URL để F5 không mất: `/staff/check-out?bookingId=...` (đang chụp) →
`/staff/check-out?sessionId=...` (đã gửi; trang tự quyết định hiện màn 08 hay màn kết quả theo `aiStatus`).

## Màn 06 – Sheet "Xe đang cho thuê" (`06_Dang-thue_Chon-xe-tra.png`)
- Ở tab "Đang thuê", bấm thẻ xe hoặc nút "Nhận lại xe · Check-out" → mở `Sheet` bên phải (dùng `components/ui/sheet.tsx`)
  thay vì chuyển trang ngay.
- Nội dung: ảnh/tên xe, biển số, badge "Đang thuê"; khách thuê (họ tên, SĐT); ảnh CCCD 2 mặt; "Nhận xe" (thời điểm check-in)
  và "Hạn trả" (nếu có; quá hạn thì tô cam/đỏ); lưới 8 ảnh lúc check-in. Trường nào đợt 0 đã quyết định bỏ thì bỏ.
- Nút "Đóng" và "Nhận lại xe · Bắt đầu Check-out" → `/staff/check-out?bookingId=...`.

## Màn 07 – Chụp 8 góc trả xe (`07_Check-out_B1-Chup-8-goc.png`)
- Header: thẻ xe + stepper 3 bước "Chụp 8 góc trả xe → AI phân tích → Kết quả".
- **Tái sử dụng** cơ chế chụp/nén ảnh của check-in (`VehicleAnglesStep`, `PhotoCaptureBox`, `AngleDiagram`,
  `usePhotoCapture`, `imageCompression`) – không viết lại. Chỉ 8 góc, không có CCCD.
- Mỗi ô góc hiện **ảnh check-in cùng góc ở góc nhỏ** để nhân viên chụp đúng vị trí; tiêu đề góc lấy từ `photoAngles.ts`.
- Thanh "Ảnh trả xe  n/8 góc đạt"; khung "Ảnh gốc lúc check-in" (ngày giờ, số ảnh).
- `StickyActionBar`: "Huỷ" (về dashboard) và "Gửi AI kiểm tra hư hại" (chỉ bật khi đủ 8/8) →
  `inspectionService.checkOut(...)` → chuyển sang `?sessionId=<sessionId trả về>`. Đang upload: khoá nút + spinner.

## Màn 08 – AI phân tích (`08_Check-out_B2-AI-phan-tich.png`, có chỉnh)
- Poll `GET /api/inspections/{sessionId}/ai-progress` mỗi ~1,5 giây (dừng khi rời trang).
- Hiển thị: thanh tiến độ % thật; **danh sách 8 góc** (tên góc, trạng thái: chờ / đang xử lý (spinner) / xong (tick xanh))
  dựa trên `currentAngle` và `completedAngles`. **Không** hiện "còn khoảng N giây".
- `DONE` → tự chuyển sang màn kết quả (cùng URL, đổi view).
- `FAILED` hoặc quá 3 phút chưa xong → thông báo lỗi thân thiện + nút "Thử lại" (`POST /ai-retry`) và "Về danh sách xe".

## Màn kết quả – điều hướng chung
Tải `GET /results`. Đếm hư hại **chưa override**:
- = 0 → **màn 09** (đợt này làm đầy đủ).
- > 0 → màn 11 (đợt 3 làm). Đợt này chỉ hiện placeholder đơn giản: danh sách hư hại dạng text, ghi rõ "đang phát triển".

## Màn 09 – Không hư hại (`09_Ket-qua_Khong-hu-hai.png`)
- Khối xanh "Xe an toàn — không có hư hại mới" + mô tả; dải 8 ảnh check-out thu nhỏ có tick xanh.
- `StickyActionBar`: dòng "Không hư hại · Xe sẽ chuyển về tab **Sẵn sàng**"; nút "Tải biên bản PDF" (tải file
  `GET /report`, tên file `Bien-ban_<bien-so>_<dd-MM-yyyy>.pdf`) và "Hoàn tất trả xe".
- "Hoàn tất trả xe" → `AlertDialog` xác nhận → `POST /complete` → về dashboard.

## Màn 10 – Về tab Sẵn sàng (`10_Tab-San-sang_Xe-tra-ve.png`)
- Dashboard mở tab "Sẵn sàng" và hiện toast "Trả xe hoàn tất – <xe> · <biển số> đã về tab Sẵn sàng".
  Dùng cơ chế `location.state` giống cách check-in đang làm (`DashboardLocationState`), mở rộng thêm, không viết lại.

## Yêu cầu chung
- Lỗi API: toast `sonner` tiếng Việt dễ hiểu; trạng thái loading dùng skeleton/spinner sẵn có.
- Responsive: dùng được trên tablet (nhân viên đi quanh xe).
- `npm run build` và `npm run lint` sạch.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
Chạy đủ db + api + ai + frontend → check-in một xe → check-out bằng **chính 8 ảnh check-in** (kỳ vọng 0 hư hại)
→ thấy màn 08 chạy từng góc → màn 09 → tải PDF → Hoàn tất → xe ở tab Sẵn sàng. F5 ở màn 08/09 không mất trạng thái.
