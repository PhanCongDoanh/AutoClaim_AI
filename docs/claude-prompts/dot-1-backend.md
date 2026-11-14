# Đợt 1 – Backend (+ chỉnh nhỏ ai-service)

Đọc `CLAUDE.md` và `docs/claude-prompts/BAO-CAO-DOT-0.md` (kèm các quyết định của tôi ở mục E).
Lập kế hoạch, liệt kê file sẽ sửa, **chờ tôi OK** rồi mới làm. Chưa đụng tới frontend trong đợt này
(trừ việc cập nhật `src/types/*` cho khớp DTO mới).

## 1. Gọi AI sau khi commit
Trong `InspectionServiceImpl.checkOut()`: đăng ký `TransactionSynchronization.afterCommit()` để gọi
`triggerAiDetection(sessionId)` sau khi transaction commit (hiện đang gọi bên trong transaction nên AI chưa thấy ảnh).
Lỗi khi gọi AI (AI tắt, timeout) **không được làm hỏng check-out**: log lỗi và đặt `ai_status = FAILED`
(cập nhật trong transaction mới, vì lúc này transaction cũ đã kết thúc).

## 2. Trạng thái AI
- Cột `inspection_sessions.ai_status` đã có (migration V6). Thêm field `aiStatus` (String) vào entity
  `InspectionSession`; khi tạo phiên `CHECK_OUT` đặt `PENDING`. Giá trị: `PENDING | PROCESSING | DONE | FAILED`
  (ai-service tự ghi `PROCESSING/DONE/FAILED`).
- Trả `aiStatus` trong `SessionResultResponseDto`.

## 3. Endpoint tiến độ AI: `GET /api/inspections/{sessionId}/ai-progress`
- Backend gọi `GET {app.ai.status-url}/{sessionId}` của ai-service. Thêm property
  `app.ai.status-url=${APP_AI_STATUS_URL:http://localhost:5000/api/ai/status}` và biến
  `APP_AI_STATUS_URL: http://ai:5000/api/ai/status` vào service `api` trong `docker-compose.yml`.
- Response (DTO mới `AiProgressDto`):
  `{ status, progress (0-100), currentAngle (vd "ANGLE_5" | null), completedAngles: ["ANGLE_1",...], newDamages | null, error | null }`.
- Nếu ai-service trả 404 hoặc không gọi được (vd AI vừa khởi động lại, mất trạng thái trong RAM): **dựa vào
  `ai_status` trong DB** – `DONE` → progress 100; còn lại → progress 0, giữ nguyên status.

## 4. Chỉnh `ai-service/app.py` (chỉ phần trạng thái, KHÔNG đổi logic phân tích)
Trong `process_session`, bổ sung vào dict `STATUS[session_id]`: `currentAngle` (góc đang xử lý),
`completedAngles` (list góc đã xong, thêm vào sau mỗi `analyze_pair`), `totalAngles`. Giữ các trường cũ.

## 5. Chạy lại AI: `POST /api/inspections/{sessionId}/ai-retry`
Chỉ cho phép khi `ai_status` là `FAILED` (hoặc `PENDING` quá 2 phút). Đặt lại `PENDING`, gọi AI như bước 1.
(ai-service tự xoá kết quả cũ chưa bị override khi chạy lại.)

## 6. Ràng buộc nghiệp vụ
- `complete`: trả 409 nếu `ai_status` chưa `DONE`; trả 409 nếu booking đã `COMPLETED` (bấm 2 lần).
- `override`: `overrideReason` bắt buộc, không rỗng (frontend luôn gửi). Không cho override hư hại của phiên đã complete.
- `RestTemplate`: connect timeout 5s, read timeout 10s.

## 7. Bổ sung DTO theo báo cáo đợt 0
Thêm các trường mà mục A của báo cáo đánh dấu "CÓ Ở DB NHƯNG API CHƯA TRẢ" và tôi đã đồng ý
(dự kiến: thời điểm check-in/check-out của phiên, thông tin xe & người thuê cho header màn kết quả,
`expectedReturnAt` cho sheet màn 06, ảnh CCCD của phiên check-in). Trường THIẾU hẳn trong DB → làm theo quyết định của tôi ở mục E.

## 8. PDF (`ReportService`) – phần chữ
- **Font tiếng Việt**: nhúng font TTF Unicode (đề xuất Noto Sans hoặc Be Vietnam Pro, giấy phép OFL) vào
  `src/main/resources/fonts/`, dùng `BaseFont.createFont(..., BaseFont.IDENTITY_H, BaseFont.EMBEDDED)`.
  Nếu không tải được file font, **dừng lại hướng dẫn tôi tải** và đặt vào đúng chỗ.
- Bố cục theo mockup `13_Bien-ban-PDF.png` (phần chữ): tiêu đề "BIÊN BẢN GHI NHẬN HƯ HẠI" (không có hư hại thì
  "BIÊN BẢN BÀN GIAO XE – KHÔNG PHÁT HIỆN HƯ HẠI MỚI"), thông tin xe, biển số, người thuê, SĐT, giờ check-in/check-out,
  ngày lập; bảng `# | Loại hư hại (nhãn tiếng Việt) | Vị trí (part_name · tên góc) | Độ tin cậy %`
  (**bỏ cột Bounding Box**); chỉ hư hại chưa override; khu ký tên "Nhân viên kiểm định" (tên nhân viên của phiên) / "Người thuê".
- Phần ảnh trong PDF để đợt 3.

## Kiểm tra cuối đợt
- `./mvnw -q -DskipTests package` thành công; `docker compose up -d --build` chạy đủ db, api, ai.
- Viết cho tôi chuỗi lệnh `curl` (hoặc hướng dẫn Swagger UI nếu backend có) để tự test: đăng nhập lấy token →
  check-in 1 xe → check-out → gọi `ai-progress` vài lần thấy tiến độ tăng → `results` có `aiStatus=DONE` →
  override 1 hư hại → `complete` → tải `report` mở được, tiếng Việt hiển thị đúng.
- Tóm tắt thay đổi + các điểm cần tôi kiểm tra.
