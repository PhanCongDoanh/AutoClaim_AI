# Đợt 0 – Khảo sát & đối chiếu (KHÔNG sửa code)

Đọc `CLAUDE.md` trước. Đợt này **chỉ đọc và viết báo cáo**, không tạo/sửa file code nào.

## Việc cần làm

1. Xem các mockup trong `docs/ui-mockups/` từ `06_` đến `13_` (2 luồng check-out):
   - Luồng 1 – không hư hại: 06 → 07 → 08 → 09 → 10
   - Luồng 2 – có hư hại: 06 → 07 → 08 → 11 → 12 → 13 → (tab Bảo trì)
2. Đọc code liên quan:
   - Backend: `InspectionController`, `InspectionServiceImpl`, `VehicleController`/`VehicleService`, `ReportService`,
     các entity, DTO (`dto/response/*`, `dto/request/*`), `RestTemplateConfig`, `application.properties`,
     toàn bộ `db/migration/V*.sql` (gồm `V6__add_ai_status.sql`).
   - Frontend: `App.tsx`, `pages/staff/Dashboard.tsx`, `pages/staff/CheckIn.tsx` + thư mục `check-in/`,
     `pages/staff/CheckOut.tsx`, `components/vehicle/*`, `components/inspection/*`, `components/layout/*`,
     `hooks/usePhotoCapture.ts`, `services/inspectionService.ts`, `services/vehicleService.ts`, `types/*`.
   - AI: `ai-service/README.md`, `ai-service/app.py` (chỉ đọc).

## Kết quả: tạo DUY NHẤT file `docs/claude-prompts/BAO-CAO-DOT-0.md` gồm

**A. Bảng đối chiếu dữ liệu** – với mỗi màn (06, 07, 08, 09, 10, 11, 12, 13), mỗi thông tin hiển thị
(vd "Hạn trả", "Số điện thoại", ảnh CCCD, giờ check-in/check-out trên ảnh so sánh, tên nhân viên trên biên bản…):

| Màn | Thông tin | Nguồn hiện có (API field / cột DB) | Trạng thái: CÓ / CÓ Ở DB NHƯNG API CHƯA TRẢ / THIẾU |

**B. Backend còn thiếu gì cho 2 luồng** – đối chiếu với danh sách dự kiến cho đợt 1 dưới đây, xác nhận
cái nào cần, cái nào code đã có sẵn, và phát hiện thêm vấn đề nếu có:
- Gọi AI **sau khi transaction commit** (hiện `triggerAiDetection` chạy trong `@Transactional`).
- Trường `aiStatus` trong entity `InspectionSession` + trả về trong `SessionResultResponseDto`.
- Endpoint tiến độ AI (chuyển tiếp `GET /api/ai/status/{id}` của ai-service) và endpoint chạy lại AI.
- Timeout cho `RestTemplate`.
- Chặn `complete` khi AI chưa xong; chặn complete 2 lần.
- `ReportService`: font Helvetica **không hiển thị được tiếng Việt có dấu**; cột "Bounding Box" in nguyên JSON.
- Các trường DTO còn thiếu theo bảng A.

**C. Frontend có thể tái sử dụng gì** – component/hook nào dùng lại được cho check-out, chỗ nào cần sửa
(vd thẻ xe "Đang thuê" hiện link thẳng sang check-out, còn mockup 06 mở một sheet chi tiết trước).

**D. Đề xuất cấu trúc frontend** – route, cách giữ trạng thái khi F5 (vd `?bookingId=` rồi `?sessionId=` trên URL),
danh sách component mới.

**E. Câu hỏi cho tôi** – mọi chỗ cần tôi quyết định (đặc biệt các trường THIẾU: thêm migration hay bỏ khỏi UI).

Viết ngắn gọn, dạng bảng/gạch đầu dòng. Xong thì dừng lại, tóm tắt các câu hỏi ở mục E trong khung chat.
