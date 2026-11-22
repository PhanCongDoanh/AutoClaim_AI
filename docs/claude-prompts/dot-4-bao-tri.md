# Đợt 4 – Bảo trì: từ tab Bảo trì → hồ sơ bảo trì → "Đã sửa xong" → về Sẵn sàng

Đọc `CLAUDE.md`, mục F của `docs/claude-prompts/BAO-CAO-DOT-0.md`, và xem mockup `14` → `17` trong `docs/ui-mockups/`.
**Đợt này đưa màn 14–17 vào phạm vi** (ghi đè ghi chú "ngoài phạm vi" ở mục F và README mockup).
Lập kế hoạch, liệt kê file sẽ sửa → **chờ tôi OK** → làm.

Mục tiêu: khép kín vòng đời xe trên giao diện nhân viên: Sẵn sàng → Đang thuê → Bảo trì → **Sẵn sàng**.
Hiện "Hoàn tất bảo trì" chỉ có ở trang admin (`VehicleManagement.tsx`) – giữ nguyên nút đó.

## Quyết định đã chốt
- **Không lưu file PDF lên Supabase, không tạo bucket mới.** Biên bản được tạo lại khi tải, qua endpoint `GET /api/inspections/{sessionId}/report`
  sẵn có (dữ liệu đã bị khoá sau khi complete nên nội dung không đổi).
- Ghi chú sửa chữa lưu vào cột `bookings.maintenance_notes` đã có (qua `PATCH /api/vehicles/{id}/complete-maintenance` sẵn có).
- Không thêm migration nếu không thật sự cần; nếu cần → hỏi tôi trước.

## Backend
1. Với xe `MAINTENANCE`, `GET /api/vehicles?status=MAINTENANCE` trả thêm (null nếu không tìm được):
   - `lastCheckOutSessionId` – phiên CHECK_OUT của booking gần nhất đã COMPLETED (lượt thuê làm xe vào bảo trì)
   - `maintenanceSince` – thời điểm vào bảo trì (thời điểm booking đó chuyển COMPLETED; nếu không có trường riêng thì dùng `updatedAt` của booking – ghi rõ lựa chọn trong kế hoạch)
   - `lastRenterName`
   - `damageCount` – số hư hại chưa override của phiên đó
   - `damageSummary` – chuỗi ngắn cho thẻ (vd "Trầy xước · Cản trước" – hư hại có độ tin cậy cao nhất, nhãn tiếng Việt theo `InspectionLabels`)
   - `maintenanceNotes` – ghi chú hiện có (nếu đã nhập)
   Tránh N+1: truy vấn gộp hoặc chỉ tính cho danh sách MAINTENANCE.
2. `complete-maintenance`: ghi chú phải lưu vào **đúng booking làm xe vào bảo trì** (booking COMPLETED gần nhất) – kiểm tra code hiện tại,
   sửa nếu đang ghi nhầm booking. Giới hạn ghi chú 1000 ký tự (400 nếu vượt). Xe không ở MAINTENANCE → 409 với message tiếng Việt.
3. Cập nhật `src/types/vehicle.ts` cho khớp.

## Frontend
### Màn 14 – Thẻ xe ở tab Bảo trì (`14_Tab-Bao-tri_Xe-vua-chuyen.png`)
- Dòng cảnh báo đỏ: "⚠ n hư hại mới · <damageSummary>" (n = `damageCount`; không có dữ liệu → "Cần kiểm tra bảo trì").
- Nút "Xem bảo trì" (icon cờ lê) → route mới `/staff/maintenance/:vehicleId`.
- Mô tả dưới tiêu đề trang khi đang ở tab Bảo trì: "Xe phát sinh hư hại sau khi trả. Bấm “Đã sửa xong” để đưa xe về Sẵn sàng."

### Màn 15 – Hồ sơ bảo trì (`15_Bao-tri_Ho-so.png`)
- "← Quay lại tab Bảo trì", tiêu đề "Hồ sơ bảo trì".
- Thẻ xe: ảnh, tên, biển số, badge "Bảo trì", dòng "Vào bảo trì dd/MM/yyyy · HH:mm (sau lần check-out của khách <tên>)".
- **Cột trái "Hư hại cần sửa"** (dữ liệu từ `GET /results` của `lastCheckOutSessionId`, chỉ hư hại chưa override):
  mỗi dòng = ảnh check-out thu nhỏ **có vùng đỏ** (tái sử dụng `FittedImage`/overlay của đợt 3) + "<loại> · <bộ phận>" + "Góc k · <tên góc>".
  Bấm ảnh → mở `Dialog` xem lớn (có thể tái sử dụng viewer đợt 3 ở chế độ chỉ xem, không có nút xoá).
- **Cột phải**:
  - "Biên bản đính kèm": tên file `Bien-ban_<bien-so>_<dd-MM-yyyy>.pdf`, dòng phụ "Tạo từ kết quả check-out", nút tải (gọi `/report`, dùng `lib/download.ts`).
  - "Ghi chú sửa chữa": textarea, placeholder "Ví dụ: Đã đánh bóng cản trước, sơn dặm cửa phải…", tối đa 1000 ký tự (có bộ đếm),
    điền sẵn `maintenanceNotes` nếu có.
- `StickyActionBar`: "Sau khi sửa xong, xe sẽ trở về tab **Sẵn sàng**" · nút "Đóng" (về tab Bảo trì) · nút xanh "Đã sửa xong".
- Trường hợp biên: xe không có phiên check-out (dữ liệu mẫu, admin đặt tay) → thay cột trái bằng thông báo "Không có dữ liệu check-out cho lần bảo trì này",
  vẫn cho nhập ghi chú và "Đã sửa xong". Xe không còn ở trạng thái Bảo trì (link cũ) → thông báo + nút về danh sách xe.

### Màn 16 – Xác nhận (`16_Bao-tri_Xac-nhan-sua-xong.png`)
- Dùng `ConfirmActionDialog` (tông xanh): "Xác nhận xe đã sửa xong?" · "<xe> · <biển số> sẽ chuyển về tab **Sẵn sàng** và có thể cho thuê tiếp." · "Huỷ" / "✓ Xác nhận".
- Xác nhận → `PATCH complete-maintenance` kèm ghi chú → về dashboard.

### Màn 17 – Về tab Sẵn sàng (`17_Tab-San-sang_Xe-sua-xong.png`)
- Dashboard mở tab "Sẵn sàng", số đếm các tab cập nhật, toast "Xe đã sẵn sàng cho thuê – <xe> · <biển số> đã về tab Sẵn sàng."
  Mở rộng `DashboardLocationState` như đợt 2–3 (xoá state sau khi hiện toast).

## Yêu cầu chung
- Tái sử dụng component/hook đã có (`useSessionResults`, `FittedImage`, `ConfirmActionDialog`, `lib/format.ts`, `lib/damage.ts`, `lib/download.ts`…).
- Lỗi API: toast tiếng Việt qua cơ chế lỗi tập trung đã có.
- `npm run build`, `npm run lint`, `./mvnw -q -DskipTests package` đều sạch.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
1. Rebuild container `api`. Check-in → check-out bằng bộ ảnh có hư hại → "Xuất PDF & Chuyển sang Bảo trì".
2. Tab Bảo trì: thẻ xe hiện đúng số hư hại và tên hư hại → "Xem bảo trì".
3. Hồ sơ: đúng danh sách hư hại chưa bị xoá, ảnh có vùng đỏ đúng chỗ, tải được PDF, nhập ghi chú.
4. "Đã sửa xong" → xác nhận → tab Sẵn sàng có toast, số đếm tab đúng. Check-in lại chính xe đó được bình thường.
5. Mở lại link hồ sơ của xe vừa sửa xong → hiện thông báo "xe không còn ở trạng thái Bảo trì".
