# Báo cáo Đợt 0 – Khảo sát & đối chiếu (luồng Check-out)

Phạm vi: mockup 06 → 14, backend (`InspectionController/ServiceImpl`, `VehicleController/Service`, `ReportService`, entity, DTO,
`RestTemplateConfig`, `application.properties`, V1–V6), frontend (`App.tsx`, `Dashboard`, `CheckIn` + `check-in/`, `CheckOut`,
`components/*`, `usePhotoCapture`, services, types), `ai-service/README.md`, `app.py` (+ đọc lướt `db.py`).
Không sửa file code nào.

**Kết luận nhanh:** gần như mọi dữ liệu mockup cần **đã có trong DB** → **không cần migration mới** cho đợt 1; chủ yếu là DTO
chưa trả ra. Hai lỗ hổng lớn ngoài danh sách dự kiến: **(1) backend không có bộ lọc JWT** → `staff_id` của mọi phiên luôn là
user mặc định `staff@autoclaim.com`, nên "Nhân viên kiểm định" trên biên bản sẽ sai; **(2) `complete` và `check-out` không chặn
gọi lặp** (complete lần 2 có thể đổi lại trạng thái xe đã sửa xong).

---

## A. Bảng đối chiếu dữ liệu

Ký hiệu trạng thái: **CÓ** · **DB-CHƯA-API** (có ở DB nhưng API chưa trả) · **THIẾU**.
`VR` = `VehicleResponseDto` (`GET /api/vehicles?status=`), `SR` = `SessionResultResponseDto` (`GET /api/inspections/{id}/results`),
`IR` = `ImageResultDto`, `DD` = `DamageDto`.

### 06 – Sheet "Xe đang cho thuê"

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Tên xe, biển số, số chỗ, ảnh xe, badge trạng thái | `VR.model/licensePlate/seats/avatarUrl/status` | CÓ |
| Họ tên khách | `VR.renterName` (← `renters.name`) | CÓ |
| Số điện thoại | `VR.renterPhone` (← `renters.phone_number`) | CÓ |
| Ảnh CCCD 2 mặt | `inspection_images` (`CCCD_FRONT/BACK`) phiên CHECK_IN; lấy được qua `SR` với `VR.checkInSessionId` (endpoint results không lọc loại phiên) | CÓ (gián tiếp) |
| Nhận xe (ngày giờ) | `inspection_sessions.created_at` (CHECK_IN) hoặc `bookings.created_at` | DB-CHƯA-API |
| Hạn trả | `bookings.expected_return_at` (form check-in bắt buộc nhập; booking cũ/seed có thể null) | DB-CHƯA-API |
| 8 ảnh lúc check-in | `SR.images[].imageUrl` của phiên CHECK_IN | CÓ (gián tiếp) |
| Thẻ xe: "Trả 30/10 · 17:00" | `bookings.expected_return_at` | DB-CHƯA-API |
| Số đếm trên tab (5 / 3 / 2) | Đếm `vehicles` theo `status`; không có endpoint đếm, `Dashboard` không truyền `counts` | THIẾU (API) |

### 07 – Chụp 8 góc trả xe

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Tên xe, biển số, số chỗ, tên khách (thẻ tóm tắt) | `VR` (tìm xe RENTED có `activeBookingId = bookingId`) | CÓ |
| Ảnh gốc check-in nhỏ ở góc mỗi ô | `SR(checkInSessionId).images[].imageUrl` theo `angleCode` | CÓ (gián tiếp) |
| Giờ chụp mỗi ảnh (10:40…) | `usePhotoCapture` → `photo.capturedAt` (phía client) | CÓ |
| "Ảnh gốc lúc check-in 28/10/2026 · 09:05" | `inspection_sessions.created_at` phiên CHECK_IN | DB-CHƯA-API |
| "8 ảnh" | đếm ảnh ANGLE_* | CÓ |
| "AI phân tích trong khoảng 15 giây" | Không có dữ liệu thời gian ước tính | THIẾU → đề xuất bỏ (giống quyết định ở màn 08) |
| Tên/role nhân viên ở header | `AuthContext.user.fullName/roleName` | CÓ |
| Chuông thông báo | Không có tính năng | THIẾU → ẩn (đã chốt) |

### 08 – AI phân tích

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Trạng thái AI (PENDING/PROCESSING/DONE/FAILED) | `inspection_sessions.ai_status` (V6); entity chưa map, `SR` chưa trả | DB-CHƯA-API |
| % tiến độ | ai-service `GET /api/ai/status/{id}` → `progress`; backend chưa chuyển tiếp | THIẾU (API backend) |
| Tiến độ theo 8 góc (chờ / đang / xong) | ai-service chỉ có `step` dạng chuỗi `"Đang xử lý góc i/8 (ANGLE_x)"` + `progress = round(100·i/8)`; `perAngle` chỉ có khi DONE | CÓ một phần – suy ra được góc hiện tại từ `progress` (không cần sửa `app.py`) |
| Lỗi AI (`FAILED`) + nút Thử lại | `ai_status = FAILED`, `error` trong status RAM; chưa có endpoint chạy lại | THIẾU (API) |
| "Còn khoảng N giây" / 3 bước căn chỉnh–nhận diện–so sánh | — | Bỏ (đã chốt) |

Lưu ý: `STATUS` của ai-service nằm trong RAM → AI restart thì `/status` trả 404 → backend phải fallback về `ai_status` trong DB.

### 09 – Kết quả không hư hại

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Xe/biển số/số chỗ/tên khách (sau F5) | `SR` chỉ có `vehicleId`; sau khi complete, booking COMPLETED → không tìm lại được qua `VR` RENTED | DB-CHƯA-API |
| "Không có hư hại mới" | `aiStatus = DONE` và không có `DD` nào `isOverridden = false` | CÓ (khi đã trả `aiStatus`) |
| 8 ảnh nhỏ có dấu ✓ | `IR.imageUrl` | CÓ |
| Tải biên bản PDF | `GET /{id}/report` | CÓ |
| Hoàn tất trả xe | `POST /{id}/complete` | CÓ (thiếu chặn, xem B) |

### 10 – Tab Sẵn sàng sau trả xe

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Toast "Trả xe hoàn tất · model · biển số" | state client khi điều hướng (giống `checkedIn` hiện có) | CÓ |
| Danh sách xe sẵn sàng | `VR` | CÓ |
| Số đếm trên tab | như màn 06 | THIẾU (API) |

### 11 – Kết quả có hư hại

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| "Phát hiện N hư hại mới" | đếm `DD` chưa override | CÓ |
| Loại hư hại (Trầy xước…) | `DD.damageType` (tên lớp tiếng Anh) → map nhãn ở FE | CÓ |
| Bộ phận (Cửa trước trái) | `DD.partName` (có thể null) | CÓ |
| "Góc 2 · Góc trước trái" | `IR.angleCode` + `ANGLE_LABELS` | CÓ |
| Độ tin cậy 89% | `DD.confidenceScore` (0..1) | CÓ |
| Ảnh check-in / check-out cùng góc | `IR.checkInImageUrl` / `IR.imageUrl` | CÓ |
| Khung/polygon hư hại, cảnh báo `aligned=false` | `DD.boundingBox` (chuỗi JSON) | CÓ (FE phải parse) |
| Nhãn "CHECK-IN · 28/10 09:05" | `inspection_sessions.created_at` CHECK_IN (hoặc `inspection_images.created_at`) | DB-CHƯA-API |
| Nhãn "CHECK-OUT · 30/10 16:48" | `inspection_sessions.created_at` CHECK_OUT | DB-CHƯA-API |
| Chấm đỏ trên thumbnail góc có lỗi | `IR.damages` | CÓ |
| Xuất PDF & chuyển Bảo trì | `complete` + `report` | CÓ |
| Lưu nháp | — | Bỏ (đã chốt) |

### 12 – Xoá lỗi AI nhầm

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| "#1 Trầy xước · Cửa trước trái" | `DD` | CÓ |
| Lý do (3 lựa chọn + "Lý do khác" có ô nhập) | `PATCH …/override` `{overrideReason}` → `damage_detections.override_reason` VARCHAR(255) | CÓ (lưu dạng văn bản) |
| Hoàn tác (bỏ override) | Không có endpoint | THIẾU (chưa rõ có cần – xem E) |

### 13 – Biên bản PDF

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Ngày lập | `LocalDateTime.now()` trong `ReportService` | CÓ |
| Phương tiện, biển số, người thuê, SĐT | `ReportService` đã in; FE lấy từ `SR` → chưa có | CÓ (PDF) / DB-CHƯA-API (FE) |
| Check-in / Check-out (ngày giờ) | `inspection_sessions.created_at` 2 phiên | DB-CHƯA-API (PDF chưa in, API chưa trả) |
| Bảng: # · loại · vị trí · độ tin cậy | `DD`; PDF đang in `damageType` tiếng Anh, `ANGLE_2` thô, cột "Bounding Box" in nguyên JSON | CÓ dữ liệu, PDF cần sửa |
| Ảnh hư hại có khung đỏ trong biên bản | `IR.imageUrl` + `boundingBox`; `ReportService` chưa chèn ảnh | THIẾU (code) – xem E |
| "Nhân viên kiểm định: Phan Công Doanh" | `inspection_sessions.staff_id → users.name` – **có ở DB nhưng giá trị sai** (không có JWT filter → luôn là user mặc định) | DB-CHƯA-API + lỗi dữ liệu |
| Người thuê ký | chữ tĩnh | CÓ |
| Stepper bước 4 "Xuất PDF" | UI | CÓ |
| Gửi khách | — | Bỏ (đã chốt) |

### 14 – Tab Bảo trì (tham chiếu)

| Thông tin | Nguồn hiện có | Trạng thái |
|---|---|---|
| Toast "Đã xuất biên bản PDF" + link "Tải lại PDF" | state client (cần `sessionId`) | CÓ |
| Dòng "2 hư hại mới · cửa trước trái" trên thẻ | `damage_detections` của phiên CHECK_OUT mới nhất; `VR` chưa trả | DB-CHƯA-API (đợt sau) |

---

## B. Backend còn thiếu gì cho 2 luồng

| # | Hạng mục dự kiến | Hiện trạng code | Cần làm? |
|---|---|---|---|
| 1 | Gọi AI **sau commit** | `triggerAiDetection` gọi trong `checkOut()` `@Transactional`; AI phải tự chờ ≤ 60s (`_wait_for_session`) | **Cần** – `TransactionSynchronization.afterCommit`. Nếu gọi AI thất bại → cập nhật `ai_status = FAILED` (giao dịch mới) để UI hiện "Thử lại" |
| 2 | `aiStatus` trong `InspectionSession` + `SR` | Cột có (V6), entity **chưa** map, DTO chưa có; backend không set `PENDING` khi tạo phiên | **Cần** – map `@Column(name="ai_status", length=20)`, set `PENDING` khi tạo CHECK_OUT, trả trong `SR` |
| 3 | Endpoint tiến độ AI + chạy lại | Chưa có. `application.properties` chỉ có `app.ai.detect-url` | **Cần** – `GET /api/inspections/{id}/ai-status` (proxy `/api/ai/status/{id}`, 404/không kết nối → fallback `ai_status` DB); `POST /api/inspections/{id}/ai/retry` (chỉ khi FAILED/kẹt PENDING và booking còn ACTIVE). Thêm `app.ai.base-url`. AI chạy lại đã giữ các dòng đã override (`db.delete_previous_ai_results`) ✓ |
| 4 | Timeout `RestTemplate` | `new RestTemplate()` – không timeout | **Cần** – connect ~3s, read ~5s |
| 5 | Chặn `complete` khi AI chưa xong / complete 2 lần | Không chặn gì. Complete lần 2 ghi đè lại trạng thái xe (vd. xe đã "sửa xong" về AVAILABLE có thể bị đẩy lại MAINTENANCE) | **Cần** – 400/409 khi `aiStatus != DONE` hoặc `booking.status = COMPLETED` |
| 6 | `ReportService`: font Helvetica, cột Bounding Box | Đúng như mô tả; ngoài ra mọi nhãn tiếng Anh, `damageType` thô, `ANGLE_2` thô, `Vehicle Status: MAINTENANCE`, không có giờ check-in/out, không có tên nhân viên | **Cần** – nhúng font TTF Unicode (`BaseFont.IDENTITY_H`), nhãn tiếng Việt, map loại hư hại + tên góc, bỏ cột bbox, thêm giờ check-in/out + nhân viên + chỗ ký |
| 7 | Trường DTO thiếu theo bảng A | — | **Cần** – xem danh sách dưới |

**Trường DTO đề xuất bổ sung (không cần migration):**
- `VehicleResponseDto` (xe RENTED): `expectedReturnAt`, `checkInAt` (created_at phiên CHECK_IN).
- `SessionResultResponseDto`: `aiStatus`, `bookingId`, `bookingStatus`, `createdAt` (giờ check-out), `checkInSessionId`, `checkInAt`,
  `expectedReturnAt`, `vehicle {model, licensePlate, seats, avatarUrl, status}`, `renter {name, phone}`, `staffName`.
  → màn 09/11/13 tự đủ dữ liệu khi F5, kể cả sau khi booking đã COMPLETED.

**Vấn đề phát hiện thêm:**
1. **Không có JWT filter** (`SecurityConfig` `permitAll`, chỉ có `JwtService`, không có `OncePerRequestFilter`) → `resolveCurrentStaff()`
   luôn rơi về `staff@autoclaim.com` ("Nguyen Van Staff"). FE vẫn gửi `Authorization: Bearer`, nhưng backend bỏ qua.
2. **`check-out` không chặn tạo phiên lặp**: không kiểm tra booking đã có phiên CHECK_OUT, không kiểm tra xe đang RENTED. Bấm 2 lần /
   gửi lại sau lỗi mạng → nhiều phiên, AI chạy nhiều lần. Đề xuất: nếu đã có phiên CHECK_OUT cho booking ACTIVE → 409 kèm `sessionId` cũ.
3. **`override` không chặn sau khi complete** (đổi kết quả sau khi đã chốt trạng thái xe/biên bản).
4. **Bí mật nằm trong `application.properties` đã commit** (S3 access/secret key, mật khẩu DB mặc định, JWT secret) – trái quy tắc 8.
   Không tự sửa; đề xuất chuyển sang biến môi trường và xoay key S3.
5. `ai_status` của phiên CHECK_OUT cũ (trước V6) là `null` → cần quy ước cách hiển thị.
6. `getSessionResults` gọi `findByImage_ImageId` 8 lần (N+1) – nhỏ, có thể gộp bằng `findByImage_Session_SessionId`.
7. Cấu hình RabbitMQ vẫn còn dù luồng AI dùng HTTP – không ảnh hưởng đợt này, chỉ ghi nhận.

---

## C. Frontend có thể tái sử dụng

| Thành phần | Dùng lại | Cần sửa |
|---|---|---|
| `VehicleCard` | Thân thẻ, badge, ảnh | Xe RENTED đang `Link` thẳng `/staff/check-out?bookingId=` → đổi thành mở sheet 06 (prop `actions` đã có, hoặc thêm `onSelect`/`selected`); hiện "Trả dd/MM · HH:mm" (cần `expectedReturnAt`); bỏ dòng SĐT trên thẻ cho giống mockup (tuỳ) |
| `VehicleStatusTabs` | Nguyên vẹn, đã có prop `counts` | `Dashboard` chưa truyền `counts` |
| `Dashboard` + `dashboardState.ts` | Khung trang, tabs, grid | Thêm `checkedOut` vào `DashboardLocationState` (mở tab AVAILABLE/MAINTENANCE + toast); mockup 10/14 dùng toast góc phải → dùng `sonner` thay banner inline; có thể lưu tab trên URL `?tab=` |
| `VehicleSummaryCard` (check-in) | Bố cục thẻ xe + stepper | `STEPS` cứng 2 bước, `step: 1 \| 2` → tổng quát hoá (`steps`, `step: number`, dòng phụ tên khách) và chuyển sang `components/inspection/` |
| `VehicleAnglesStep` | Sơ đồ góc + lưới 8 ô + thanh tiến độ | Chữ cứng ("Ảnh ngoại thất", hộp "Xác nhận cho thuê") → nhận prop tiêu đề/ghi chú; truyền ảnh tham chiếu check-in |
| `PhotoCaptureBox` | Nguyên vẹn | Thêm prop `referenceUrl` (ảnh gốc nhỏ góc phải dưới như màn 07) |
| `AngleDiagram`, `photoAngles.ts`, `usePhotoCapture`, `StickyActionBar`, `CarIllustration` | Dùng nguyên | — (`getOrderedFiles(VEHICLE_PHOTO_KEYS)` đúng thứ tự backend gán ANGLE_1..8) |
| `inspectionService` | `checkOut`, `getSessionResults`, `overrideDamage`, `completeInspection`, `downloadReport` | Thêm `getAiStatus`, `retryAi` |
| `types/inspection.ts` | — | Thêm trường theo B.7; kiểu `BoundingBox` + hàm parse an toàn cho `boundingBox` (chuỗi JSON) |
| `components/ui` | `sheet` (06), `alert-dialog` (12, xác nhận), `tabs`, `card`, `button` | Chưa có **radio-group** và **textarea** (màn 12). Không có `@radix-ui/react-radio-group` trong `package.json` → hoặc thêm gói, hoặc làm radio bằng `<input type="radio">` + style |
| `Header` | — | Chuông + chấm đỏ giả → ẩn. Mục nav "Check-out" trỏ `/staff/check-out` không tham số → trang phải xử lý thiếu tham số (như `VehicleNotReady` của CheckIn) hoặc bỏ mục nav |
| `CheckOut.tsx` | — | Hiện là trang giữ chỗ tiếng Anh → viết mới |

---

## D. Đề xuất cấu trúc frontend

**Route:** giữ `/staff/check-out`, trạng thái nằm trên URL để F5 không mất:

| URL | Bước hiển thị |
|---|---|
| `?bookingId=X` | B1 – chụp 8 góc (07). Ảnh đã chụp nằm trong bộ nhớ → F5 sẽ mất ảnh (chấp nhận, có cảnh báo `beforeunload` tuỳ chọn) |
| sau khi gửi: `navigate('?sessionId=Y', { replace: true })` | Bước suy ra từ `SR`: `aiStatus` PENDING/PROCESSING → 08; FAILED → 08 + Thử lại; DONE & booking ACTIVE → 09 (0 lỗi) hoặc 11; booking COMPLETED & xe MAINTENANCE → 13 |
| Hoàn tất luồng 1 | `navigate('/staff', { state: { checkedOut } })` → tab Sẵn sàng + toast (10) |
| Hoàn tất luồng 2 | Xác nhận → `complete` → ở lại `?sessionId=Y` (bước 13) → "Về tab Bảo trì" → toast có "Tải lại PDF" (14) |

Polling: 08 gọi `ai-status` mỗi ~1.5–2s đến DONE/FAILED, rồi tải `results`. Màn 06 dùng `results` của phiên CHECK_IN để lấy CCCD + 8 ảnh.

**Component / file mới (dự kiến):**
- `components/inspection/InspectionStepper.tsx` (tách từ `VehicleSummaryCard`), `components/ui/radio-group.tsx`, `components/ui/textarea.tsx`
- `lib/damage.ts` (`DAMAGE_LABELS`, `parseBoundingBox`), `lib/format.ts` (định dạng ngày giờ vi-VN)
- `hooks/useCheckOutSession.ts` (tải `results` theo `sessionId`), `hooks/useAiProgress.ts` (polling)
- `pages/staff/dashboard/RentedVehicleSheet.tsx` (06)
- `pages/staff/check-out/`:
  `CheckOutCaptureStep.tsx` (07) · `AiProgressCard.tsx` (08, 8 góc + % + FAILED/Thử lại) ·
  `NoDamageResult.tsx` (09) · `DamageReview.tsx` (11) gồm `DamageList`, `DamageListItem`, `ComparisonViewer`
  (Song song mặc định, Trượt so sánh phụ), `DamageOverlay` (SVG polygon/rect theo toạ độ 0..1, cảnh báo `aligned=false`),
  `AngleThumbnailStrip` · `OverrideDamageDialog.tsx` (12) · `ConfirmCompleteDialog.tsx` · `ReportStep.tsx` (13)

---

## E. Câu hỏi cần anh/chị quyết định

1. **Trường "thiếu"**: tất cả (Hạn trả, giờ Nhận xe, giờ check-in/check-out trên ảnh và biên bản, tên nhân viên) đều **có sẵn ở DB** →
   em chỉ mở rộng DTO, **không tạo migration**. Đồng ý? Riêng "AI phân tích trong khoảng 15 giây" (07) không có dữ liệu → **bỏ**?
2. **Tên nhân viên trên biên bản** đang luôn là user mặc định vì backend không có JWT filter. Chọn:
   (a) thêm JWT filter đọc token để `staff_id` là người đăng nhập thật (giữ `permitAll`, không chặn request) – *đề xuất*;
   (b) bỏ tên nhân viên khỏi biên bản.
3. **Ảnh hư hại có khung trong PDF** (như mockup 13): (a) có – backend tải ảnh từ S3 và vẽ khung bằng OpenPDF (PDF nặng hơn, chậm hơn);
   (b) chỉ bảng, không ảnh – *đơn giản hơn*.
4. **Font tiếng Việt cho PDF**: cho phép thêm file TTF giấy phép OFL (vd. Noto Sans / Be Vietnam Pro) vào `backend/src/main/resources/fonts/`?
5. **Màn 13 hiển thị biên bản**: (a) nhúng chính file PDF thật (iframe từ blob) – *đề xuất, luôn khớp file tải về*; (b) dựng lại bằng HTML như mockup.
6. **Lý do xoá lỗi AI**: lưu nguyên văn nhãn tiếng Việt ("Bóng phản chiếu / ánh sáng"…) hoặc nội dung tự nhập vào `override_reason` – OK?
   Có cần chức năng **hoàn tác** (bỏ override) không? (hiện không có endpoint)
7. **Tiến độ 8 góc (08)**: suy ra góc hiện tại từ `progress` của ai-service, **không sửa `app.py`** – *đề xuất*. Hay cho phép thêm trường
   có cấu trúc (vd. `angleIndex`, `angles[]`) vào `app.py`?
8. **Số đếm trên tab** (5/3/2): thêm endpoint `GET /api/vehicles/counts`, gọi 3 lần list, hay bỏ số đếm?
9. **Check-out gửi lặp**: khi booking đã có phiên CHECK_OUT → trả 409 kèm `sessionId` cũ để FE chuyển sang phiên đó – đồng ý?
10. **AI không gọi được lúc check-out**: đặt ngay `ai_status = FAILED` để hiện nút "Thử lại" – đồng ý? Phiên CHECK_OUT cũ có `ai_status = null`
    hiển thị thế nào (coi như DONE hay FAILED)?
11. **Lấy thông tin booking khi F5 ở bước chụp (07)**: dùng lại `GET /api/vehicles?status=RENTED` rồi lọc theo `activeBookingId` (không thêm API)
    – *đề xuất*; hay thêm `GET /api/bookings/{id}`?
12. **Sau "Hoàn tất trả xe" (luồng 1)**: về Dashboard tab Sẵn sàng + toast (mockup 10), không có hộp thoại xác nhận vì đây là luồng không hư hại?
    (CLAUDE.md yêu cầu xác nhận trước thao tác không hoàn tác → em định **có** hộp thoại cho cả 2 luồng.)
13. **Bí mật trong `application.properties`** (key S3, mật khẩu DB, JWT secret) đã nằm trong git: có muốn em chuyển sang biến môi trường
    ở đợt 1 không? (key S3 nên được xoay lại phía Supabase.)
14. **Mục nav "Check-in"/"Check-out" trên Header** (không có tham số xe): giữ và hiện thông báo "chọn xe từ danh sách", hay bỏ khỏi menu?

---

## F. Quyết định đã chốt (trả lời mục E – nguồn sự thật cho đợt 1, 2, 3)

> Các đợt sau chạy ở cuộc trò chuyện mới và chỉ đọc file này. Nếu mục B–D ở trên khác với mục F, **theo mục F**.
> Tên endpoint/property **theo đúng prompt từng đợt** (`/ai-progress`, `/ai-retry`, `app.ai.status-url`, timeout 5s/10s),
> không theo tên tạm trong mục B.

| # | Quyết định | Đợt |
|---|---|---|
| 1 | **Không viết migration mới.** Chỉ bổ sung trường vào DTO (xem "Trường DTO đề xuất bổ sung" ở mục B). Màn 07 **bỏ** dòng "AI phân tích trong khoảng 15 giây". | 1 (DTO), 2 (màn 07) |
| 2 | **Thêm bộ lọc JWT kiểu "không phá vỡ":** chỉ khi request có `Authorization: Bearer …` hợp lệ mới đặt user vào `SecurityContext`; token thiếu/sai → bỏ qua, **không** trả 401. **Giữ nguyên** `permitAll` hiện tại, đợt này không chặn request nào. `resolveCurrentStaff()` lấy từ `SecurityContext`, không có thì dùng user mặc định như cũ. Đã kiểm tra: frontend **đã gửi** header `Authorization: Bearer <token>` (`frontend/src/utils/axiosInstance.ts`, interceptor đọc token đã lưu). → Tên "Nhân viên kiểm định" trên PDF lấy từ `inspection_sessions.staff_id`. | 1 |
| 3 | **PDF có chèn ảnh check-out của các góc có hư hại** (chưa override), làm ở đợt 3 theo prompt. Khung/polygon đỏ trên ảnh là **tuỳ chọn** – chỉ vẽ nếu gọn, không thì ảnh trơn. | 3 |
| 4 | **Đồng ý thêm font TTF tiếng Việt giấy phép OFL** (Noto Sans hoặc Be Vietnam Pro) vào `backend/src/main/resources/fonts/`. | 1 |
| 5 | **Màn 13 nhúng chính file PDF thật** (`GET /report` → Blob → `URL.createObjectURL` → `<iframe>`), không dựng lại HTML. | 3 |
| 6 | `override_reason` lưu **nguyên văn nhãn tiếng Việt** của lựa chọn ("Bóng phản chiếu / ánh sáng", "Bụi bẩn, vết nước", "Hư hại đã có từ trước"); "Lý do khác" lưu dạng **`Lý do khác: <nội dung nhân viên nhập>`**. **Không làm hoàn tác** override (đã có hộp thoại xác nhận trước khi xoá). Lưu ý cột là VARCHAR(255) → giới hạn độ dài ô nhập ở FE cho vừa. | 3 (FE), 1 (backend bắt buộc `overrideReason`) |
| 7 | **Được sửa `ai-service/app.py`, chỉ phần `STATUS`:** thêm `currentAngle`, `completedAngles`, `totalAngles` (giữ các trường cũ, không đụng logic phân tích). Backend `/ai-progress` chuyển tiếp các trường này. **Sau khi sửa phải nhắc người dùng rebuild container ai** (`docker compose up -d --build ai`). | 1 (app.py + backend), 2 (UI màn 08) |
| 8 | **Thêm `GET /api/vehicles/counts`** trả `{ "AVAILABLE": n, "RENTED": n, "MAINTENANCE": n }` bằng **một** truy vấn `GROUP BY status`, bỏ qua xe `is_deleted = true` (trạng thái không có xe nào → trả 0). Dashboard truyền vào `VehicleStatusTabs.counts` và tải lại sau check-in/check-out. | 1 (endpoint), 2 (dashboard) |
| 9 | **Check-out gửi lặp** (booking đã có phiên CHECK_OUT) → backend trả **409 kèm `sessionId` cũ** trong body; frontend bắt 409 và chuyển sang `/staff/check-out?sessionId=<cũ>`. Định dạng body 409 phải ghi rõ trong tóm tắt đợt 1 và cập nhật `src/types/*`. | 1 (backend), 2 (FE) |
| 10 | **Không gọi được AI** (tắt/timeout) khi check-out → đặt `ai_status = FAILED` ngay (giao dịch mới). **Phiên CHECK_OUT cũ có `ai_status = null` coi là `FAILED`** (backend chuẩn hoá khi trả `aiStatus`/`ai-progress`, và `ai-retry` chấp nhận `null`) để hiện nút "Thử lại" – chạy lại an toàn vì ai-service tự xoá kết quả cũ chưa override. | 1 (backend), 2 (UI) |
| 11 | **Không thêm endpoint booking.** Màn 07 khi F5 (`?bookingId=`) dùng lại `GET /api/vehicles?status=RENTED` rồi lọc theo `activeBookingId`. Không tìm thấy → thông báo + nút về dashboard. | 2 |
| 12 | **Có hộp thoại xác nhận ở cả hai luồng**: "Hoàn tất trả xe" (màn 09) và "Xuất PDF & Chuyển sang Bảo trì" (màn 11). | 2 (09), 3 (11) |
| 13 | **Chuyển bí mật sang biến môi trường – làm thành bước riêng ĐẦU TIÊN của đợt 1**, kiểm tra xong mới làm tiếp: (a) `application.properties` dùng `${...}`, **không** để giá trị mặc định là bí mật thật (S3 access/secret key, mật khẩu DB, JWT secret); (b) tạo `.env` ở thư mục gốc cho docker compose tự đọc + `.env.example` giá trị mẫu; (c) áp dụng cho mật khẩu DB đang ghi cứng trong `docker-compose.yml` (service `db`, `api`, `ai`); (d) `docker compose up -d --build` phải chạy được trước khi làm tiếp; (e) hướng dẫn người dùng tạo lại key S3 trên Supabase và đổi JWT secret. **⚠ Đã kiểm tra: `.gitignore` ở thư mục gốc hiện CHƯA bỏ qua `.env`** (chỉ `ai-service/.gitignore` có) → phải thêm `.env` vào `.gitignore` gốc **trước khi** tạo file `.env`, rồi xác nhận bằng `git check-ignore -v .env`. | 1 (bước 0) |
| 14 | **Bỏ mục "Check-in"/"Check-out" khỏi menu Header** (giữ "Danh sách xe"). **Giữ route** `/staff/check-in`, `/staff/check-out`; vào thẳng URL mà không có xe/booking/session hợp lệ → thông báo **"Hãy chọn xe từ danh sách"** kèm nút về dashboard (CheckIn đang có `VehicleNotReady` tương tự – dùng chung/đồng bộ câu chữ). | 2 |

**Các quyết định đã chốt từ trước trong `CLAUDE.md` (nhắc lại):** màn 08 tiến độ theo 8 góc thật, không "còn N giây";
màn 11 mặc định "Song song"; bỏ "Lưu nháp" (11) và "Gửi khách" (13); **ẩn chuông thông báo** (Header); trạng thái `FAILED`
có nút "Thử lại"; xác nhận trước thao tác không hoàn tác; "Lý do khác" bắt buộc nhập.

**Ngoài phạm vi (để sau):** hiển thị "n hư hại mới · <bộ phận>" trên thẻ tab Bảo trì (mockup 14), màn 15–16 (hồ sơ bảo trì).
