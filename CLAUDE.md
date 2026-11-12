# AutoClaim AI – Ngữ cảnh dự án cho Claude Code

Đồ án tốt nghiệp: hệ thống kiểm định ngoại thất xe tự lái cho thuê. Nhân viên chụp 8 góc xe lúc giao (check-in)
và lúc nhận lại (check-out); AI so sánh từng cặp ảnh để phát hiện **hư hại mới**; nhân viên duyệt kết quả, xuất
biên bản PDF; xe về "Sẵn sàng" (không hư hại) hoặc "Bảo trì" (có hư hại).

Giao diện và giao tiếp với người dùng: **tiếng Việt**. Code, tên biến, commit message: tiếng Anh.

## Kiến trúc (3 phần)

| Thư mục | Công nghệ | Ghi chú |
|---|---|---|
| `frontend/` | React 19 + TypeScript + Vite, Tailwind 3, component kiểu shadcn (`src/components/ui`), Radix, `sonner` (toast), `axios`, `react-router-dom` 7, `lucide-react` | Gọi backend qua `src/services/*`, kiểu dữ liệu trong `src/types/*` mô phỏng DTO của backend |
| `backend/` | Spring Boot, JPA, Flyway, PostgreSQL, lưu ảnh trên Supabase S3, OpenPDF | Cổng 8080, prefix `/api` |
| `ai-service/` | Python FastAPI + YOLOv8-seg (Ultralytics) + OpenCV | Cổng 5000. **Ghi kết quả trực tiếp vào bảng `damage_detections`** |

Chạy: `docker compose up -d --build` (db + api + ai) ở thư mục gốc; frontend: `cd frontend && npm run dev`.
Xem log AI: `docker compose logs -f ai`.

## Luồng check-out (đã có ở backend)

1. `POST /api/inspections/check-out` (multipart: `data` = `{bookingId}`, 8 ảnh ANGLE_1..8) → tạo phiên `CHECK_OUT`,
   lưu ảnh, gọi AI `POST {app.ai.detect-url}` với `{"sessionId"}`. AI trả 202 rồi xử lý nền.
2. AI service: đọc DB → ghép cặp ảnh check-in/check-out theo `angle_code` → phát hiện + căn chỉnh + so khớp
   → **chỉ INSERT các hư hại MỚI** vào `damage_detections` → cập nhật `inspection_sessions.ai_status`
   (`PROCESSING` → `DONE` / `FAILED`). Tiến độ chi tiết: `GET http://<ai>:5000/api/ai/status/{sessionId}`.
3. `GET /api/inspections/{sessionId}/results` → ảnh check-out kèm ảnh check-in cùng góc + danh sách hư hại.
4. `PATCH /api/inspections/damages/{detectionId}/override` (`{overrideReason}`) → nhân viên loại lỗi AI nhầm.
5. `POST /api/inspections/{sessionId}/complete` → đếm hư hại **chưa bị override**: 0 → xe `AVAILABLE`, >0 → `MAINTENANCE`.
6. `GET /api/inspections/{sessionId}/report` → PDF biên bản.

## Hợp đồng dữ liệu với AI (không đổi định dạng)

`damage_detections.bounding_box` (JSONB), toạ độ **chuẩn hoá 0..1** theo kích thước ảnh check-out:
```json
{"x":0.42,"y":0.51,"w":0.13,"h":0.09,"normalized":true,
 "polygon":[[0.42,0.51],[0.55,0.52]], "matchIou":0.0, "aligned":true}
```
- `aligned=false`: AI không căn chỉnh được cặp ảnh góc đó → UI hiện cảnh báo cho nhân viên kiểm tra kỹ.
- Dữ liệu cũ có thể thiếu `polygon` → khi đó vẽ hình chữ nhật từ x,y,w,h.

`damage_type` (tên lớp tiếng Anh) → nhãn hiển thị:
`scratch` Trầy xước · `dent` Móp méo · `crack` Nứt · `glass_shatter` Vỡ kính · `lamp_broken` Vỡ đèn · `tire_flat` Xẹp lốp
(giá trị lạ: hiển thị nguyên văn). `part_name` đã là tiếng Việt (vd "Cửa trước trái") → hiển thị nguyên văn, có thể null.

Tên 8 góc lấy từ `frontend/src/components/inspection/photoAngles.ts` (1 Đầu xe … 8 Góc trước phải), không viết lại.

## Mockup UI

`docs/ui-mockups/` – ảnh thiết kế đánh số theo luồng (06 → 13). **Dữ liệu trong mockup là dữ liệu mẫu**:
không hardcode tên người, biển số, ngày giờ, số liệu. Mọi dữ liệu lấy từ API/DB.

Các thay đổi đã chốt so với mockup:
- Màn 08 (AI phân tích): hiển thị tiến độ **theo 8 góc thật** (chờ / đang xử lý / xong) + % thật. **Không** có "còn khoảng N giây".
- Màn 11 (kết quả): chế độ xem mặc định **Song song**; "Trượt so sánh" là tuỳ chọn phụ.
- **Bỏ** nút "Lưu nháp" (màn 11) và "Gửi khách" (màn 13). Ẩn chuông thông báo nếu chưa có tính năng thật.
- Thêm: trạng thái AI lỗi (`FAILED`) có nút "Thử lại"; hộp thoại xác nhận trước thao tác không hoàn tác
  (hoàn tất trả xe / chuyển bảo trì); "Lý do khác" khi xoá lỗi AI phải có ô nhập lý do.

## Quy tắc làm việc (bắt buộc)

1. **Lập kế hoạch trước, chờ tôi trả lời "OK" rồi mới sửa code.** Kế hoạch liệt kê file sẽ tạo/sửa.
2. **DB là nguồn sự thật.** Mockup cần dữ liệu mà DB/API chưa có → **dừng lại hỏi**, đề xuất phương án
   (thêm cột qua migration mới / bỏ trường khỏi UI). Không tự bịa trường.
3. Migration: **không sửa** V1–V6 đã có; thay đổi schema → tạo `V7__...sql` trở đi (Flyway, `ddl-auto=validate`).
4. Không đổi logic AI trong `ai-service/detector.py`. Chỉ sửa `ai-service/app.py` khi prompt yêu cầu rõ.
5. Tái sử dụng component có sẵn (`components/ui/*`, `StickyActionBar`, `VehicleSummaryCard`, `AngleDiagram`,
   `PhotoCaptureBox`, `usePhotoCapture`, `VehicleStatusTabs`…) và giữ style hiện tại (màu `brand-*` trong tailwind config).
6. Cập nhật `src/types/*` khi DTO backend đổi. Không dùng `any`.
7. Sau mỗi phần: frontend `npm run build` + `npm run lint` phải sạch; backend phải compile (`./mvnw -q -DskipTests package`).
8. Không commit bí mật (key S3, mật khẩu, JWT secret). Không tự `git commit`/`push` – tôi tự commit sau khi kiểm tra.
9. Kết thúc mỗi đợt: tóm tắt đã làm gì, file nào đổi, **hướng dẫn tôi tự test từng bước**, và những gì còn dở.
