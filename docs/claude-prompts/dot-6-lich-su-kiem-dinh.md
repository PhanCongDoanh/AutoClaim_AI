# Đợt 6 – Lịch sử kiểm định (Staff): tra cứu lượt thuê đã trả để giải quyết tranh chấp

Đọc `CLAUDE.md`, mục F của `BAO-CAO-DOT-0.md`, xem mockup `S1`, `S2`, `S2b`, `S3` trong `docs/ui-mockups/`.
Lập kế hoạch, liệt kê file → **chờ tôi OK** → làm. Dữ liệu trong mockup là dữ liệu mẫu, không hardcode.

Mục đích: khi khách khiếu nại sau khi trả xe, nhân viên mở lại lượt thuê cũ để xem ảnh trước/sau, kết quả AI,
ai đã loại lỗi nào và vì sao, tải lại biên bản, kiểm tra toàn vẹn ảnh. **Trang chỉ xem**, không có thao tác sửa.

## Backend
1. **Nhật ký loại lỗi AI** – migration tiếp theo (V8 nếu đợt SHA-256 đã dùng V7; kiểm tra số thực tế):
   `ALTER TABLE damage_detections ADD COLUMN overridden_by UUID REFERENCES users(user_id), ADD COLUMN overridden_at TIMESTAMP;`
   Endpoint override ghi `overridden_by` = nhân viên hiện tại (cùng cách `resolveCurrentStaff()` đang dùng) và `overridden_at`.
   `DamageDto` trả thêm `overriddenByName`, `overriddenAt` (bản ghi cũ: null).
2. **`GET /api/inspections/history`** – tham số: `search`, `result` (`ALL|DAMAGED|CLEAN`), `month` (`YYYY-MM`, trống = tất cả), `page` (từ 0), `size` (mặc định 10, tối đa 50).
   - Chỉ gồm booking `COMPLETED` có phiên `CHECK_OUT`; sắp theo thời điểm check-out mới nhất trước.
   - `search`: không phân biệt hoa thường, khớp biển số / tên xe / tên khách (ILIKE). Muốn không phân biệt dấu cần extension `unaccent` → **hỏi tôi trước**, mặc định không làm.
   - `month` lọc theo thời điểm check-out (giờ Việt Nam).
   - `result` dựa trên **số hư hại chưa override** (kết quả cuối sau khi nhân viên duyệt): >0 → DAMAGED, =0 → CLEAN.
   - Mỗi dòng: `checkOutSessionId`, `bookingId`, xe (`model`, `licensePlate`, `avatarUrl`), `renterName`, `renterPhone`,
     `checkInAt`, `checkOutAt`, `damageCount`, `overriddenCount`, `result`.
   - Trả dạng trang: `{ items, page, size, totalItems, totalPages }`. Đếm hư hại bằng truy vấn gộp – **không N+1**.
3. **`GET /api/inspections/history/months`** – danh sách các tháng có lượt trả xe (`["2026-11","2026-10",…]`, mới nhất trước).
4. **`SessionResultResponseDto`** trả thêm (nếu chưa có): `handoverNotes`, `maintenanceNotes`, `checkInStaffName` (nhân viên phiên check-in);
   `staffName` hiện có là nhân viên check-out.

## Frontend
### Header
Thêm mục **"Lịch sử kiểm định"** (icon lịch sử) cạnh "Danh sách xe", route `/staff/history`, trạng thái active như mockup.
**Vẫn ẩn chuông thông báo** (quyết định cũ, dù mockup có).

### S1/S2/S2b – Danh sách (`/staff/history`)
- Tiêu đề "Lịch sử kiểm định", mô tả "Các lượt thuê đã trả xe. Bấm “Xem” để xem lại ảnh và kết quả AI."
- Thanh lọc: ô tìm kiếm (debounce ~300 ms) · dropdown "Kết quả: Tất cả / Có hư hại mới / Không hư hại" · dropdown tháng
  ("Tất cả thời gian" + các tháng từ `/history/months`; mặc định tháng hiện tại nếu có dữ liệu, không thì "Tất cả thời gian").
  **Không** làm "Chọn tháng khác…".
- Bảng: Xe (ảnh, tên, biển số) · Khách thuê (tên, SĐT) · Nhận xe · Trả xe · Kết quả (badge đỏ "Có hư hại (n)" / xanh "Không hư hại";
  nếu có lỗi đã loại thì tooltip "đã loại m lỗi AI nhầm") · nút "Xem".
- Phân trang server-side, 10 dòng/trang: "Hiển thị a–b trên N lượt trả xe [trong tháng MM/YYYY]" + Trước/Sau/số trang.
- **Lưu bộ lọc + trang trên URL** (query string) để bấm "Quay lại" từ trang chi tiết vẫn giữ nguyên bộ lọc.
- Trạng thái loading (skeleton), rỗng ("Không có lượt trả xe nào phù hợp"), lỗi (toast + nút thử lại). Bố cục dùng được trên tablet
  (bảng cuộn ngang trong khung riêng hoặc chuyển dạng thẻ ở màn hẹp).

### S3 – Chi tiết lượt thuê (`/staff/history/:checkOutSessionId`)
- "← Quay lại Lịch sử kiểm định" (giữ bộ lọc), tiêu đề "Chi tiết lượt thuê", nút "Tải biên bản PDF" (dùng `useReportDownload` có sẵn).
- 3 thẻ đầu: xe · khách thuê (tên, SĐT) · thời gian: Nhận xe, Trả xe, **NV giao xe**, **NV nhận lại xe**.
- **Cột trái "Ảnh đối chiếu 8 góc"**: lưới 8 góc, mỗi góc 1 cặp TRƯỚC/SAU; ảnh SAU có vùng đỏ cho hư hại **chưa override**
  (tái sử dụng `AnnotatedImage`); góc có hư hại viền đỏ + chấm đỏ cạnh tên góc. Bấm 1 cặp → `Dialog` xem lớn (tái sử dụng viewer đợt 3 ở
  chế độ chỉ xem: Song song mặc định / Trượt so sánh, không có nút xoá).
- **Cột phải**:
  - "Kết quả AI": dòng tóm tắt "n hư hại mới · m lỗi đã được nhân viên loại bỏ"; hư hại chưa override (tag "Hư hại mới");
    hư hại đã override gạch ngang + tag "AI nhầm" + "Lý do: … · <người loại> · <dd/MM HH:mm>" (bản ghi cũ không có người → chỉ hiện lý do).
  - "Kiểm tra toàn vẹn": nếu `IntegrityCheckPanel` đã có (đợt SHA-256) thì gắn vào đây; chưa có thì bỏ qua mục này.
  - "Ảnh CCCD người thuê": **ẩn mặc định**, nút "Hiện ảnh CCCD" mới hiện 2 ảnh (dữ liệu cá nhân nhạy cảm).
  - "Ghi chú bàn giao" (nếu có) và "Ghi chú sửa chữa" (nếu xe từng vào bảo trì và có ghi chú).
- Phiên không tồn tại / không phải CHECK_OUT đã hoàn tất → thông báo + nút về Lịch sử.

## Yêu cầu chung
- Tái sử dụng tối đa component/hook/lib đã có; lỗi API qua cơ chế lỗi tập trung.
- `npm run build`, `npm run lint`, `./mvnw -q -DskipTests package` sạch.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
1. Rebuild `api` (có migration). Tạo ít nhất 2 lượt trả xe: 1 không hư hại, 1 có hư hại trong đó **loại 1 lỗi AI nhầm**.
2. Lịch sử: thấy cả 2 lượt, lọc "Có hư hại"/"Không hư hại" đúng, tìm theo biển số/tên khách đúng, đổi tháng đúng, phân trang đúng.
3. Vào chi tiết → Quay lại: bộ lọc còn nguyên.
4. Chi tiết lượt có hư hại: vùng đỏ đúng chỗ, lỗi đã loại hiện gạch ngang kèm lý do + **tên người loại + thời gian**, CCCD chỉ hiện khi bấm,
   tải PDF được, kiểm tra toàn vẹn chạy (nếu đã có đợt SHA-256).
5. Lượt thuê cũ (trước migration): lỗi đã loại chỉ hiện lý do, không lỗi trang.
