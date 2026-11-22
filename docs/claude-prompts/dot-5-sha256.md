# Đợt 5 – Toàn vẹn ảnh bằng SHA-256 (chống giả mạo bằng chứng)

Đọc `CLAUDE.md` và mục F của `docs/claude-prompts/BAO-CAO-DOT-0.md`. Lập kế hoạch, liệt kê file → **chờ tôi OK** → làm.

## Mục tiêu
Chứng minh được: ảnh check-in/check-out **không bị sửa kể từ lúc backend nhận** – kể cả khi ai đó thay file trên Supabase.
Cơ chế: tính SHA-256 trên đúng các byte backend nhận được, lưu vào DB, in lên biên bản PDF (khách giữ 1 bản),
và có chức năng kiểm tra lại bất cứ lúc nào bằng cách tính lại hash của file đang nằm trong storage.

## 0. Sửa lỗi nhỏ còn tồn đọng (màn hồ sơ bảo trì)
Khi `lastCheckOutSessionId` là `null`/`undefined` thì **không gọi** `/results` (hiện đang gọi với id rỗng → báo "Không tải được kết quả
check-out"); hiện trạng thái "Không có dữ liệu check-out cho lần bảo trì này" như đã thiết kế ở đợt 4.

## 1. Backend
1. **Migration `V7__add_image_sha256.sql`**: `ALTER TABLE inspection_images ADD COLUMN sha256 CHAR(64);` (cho phép NULL – ảnh của phiên cũ không có hash).
   Thêm field `sha256` vào entity `InspectionImage`.
2. **Util `HashUtils.sha256Hex(byte[])`** (MessageDigest, hex chữ thường, 64 ký tự). Unit test với vector chuẩn:
   `sha256Hex("abc".getBytes(UTF_8))` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.
3. **Khi upload** (vòng lặp upload trong `InspectionServiceImpl`, cả check-in lẫn check-out, gồm cả 2 ảnh CCCD):
   đọc `file.getBytes()` **một lần**, tính hash trên mảng byte đó và upload **chính mảng byte đó** (thêm overload
   `S3StorageService.uploadBytes(byte[], contentType, folder)` nếu cần) – đảm bảo byte được hash = byte được lưu. Lưu hash vào `sha256`.
4. **Mã xác thực biên bản (session fingerprint)** – một hash duy nhất đại diện cho cả biên bản:
   SHA-256 của chuỗi chuẩn hoá (UTF-8, các dòng nối bằng `\n`, theo đúng thứ tự):
   ```
   AUTOCLAIM-REPORT-V1
   session:<checkOutSessionId>
   checkin:<checkInSessionId>
   <angleCode>:<sha256 ảnh check-in>       (các ảnh check-in, sắp theo angleCode, gồm CCCD_FRONT/BACK)
   <angleCode>:<sha256 ảnh check-out>      (các ảnh check-out, sắp theo angleCode)
   damage:<detectionId>:<damageType>:<confidence 4 chữ số thập phân>   (chỉ hư hại CHƯA override, sắp theo detectionId)
   ```
   Hash thiếu (ảnh cũ) ghi là `none`. Viết hàm này ở một service riêng (vd `IntegrityService`), có unit test cho tính ổn định
   (cùng dữ liệu → cùng mã; đổi 1 hash ảnh hoặc override 1 hư hại → mã khác). Ghi chuỗi chuẩn hoá vào javadoc để người khác tự kiểm chứng được.
5. **Endpoint `GET /api/inspections/{sessionId}/integrity`** (dùng cho phiên CHECK_OUT; tự gồm cả ảnh của phiên CHECK_IN tương ứng):
   ```json
   { "sessionFingerprint": "…64 hex…", "checkedAt": "...",
     "summary": { "total": 18, "verified": 18, "mismatch": 0, "missingFile": 0, "noHash": 0 },
     "images": [ { "imageId":"…", "sessionType":"CHECK_IN|CHECK_OUT", "angleCode":"ANGLE_1",
                   "storedHash":"…", "currentHash":"…", "status":"VERIFIED|MISMATCH|MISSING_FILE|NO_HASH" } ] }
   ```
   `currentHash` = tải file **từ storage** bằng `S3StorageService.download` (đọc qua S3 API, không qua link public có thể bị cache)
   rồi tính lại. Tải các ảnh song song có giới hạn (vd 4 luồng), lỗi tải 1 ảnh → `MISSING_FILE`, không làm hỏng cả response.
6. **DTO kết quả**: thêm `sha256` và `checkInSha256` vào `ImageResultDto` (cho frontend hiển thị).
7. **PDF (`ReportService`)** – thêm mục cuối trước khu ký tên: **"Xác thực toàn vẹn dữ liệu"**
   - Một câu giải thích: "Mỗi ảnh được gắn mã SHA-256 tại thời điểm hệ thống tiếp nhận. Mã thay đổi nếu ảnh bị chỉnh sửa dù chỉ 1 điểm ảnh."
   - Bảng: `Góc | SHA-256 ảnh check-in | SHA-256 ảnh check-out` – đủ 64 ký tự, font Courier cỡ nhỏ (hex là ASCII, Courier dựng sẵn của OpenPDF hiển thị được),
     cho xuống dòng trong ô nếu cần. Gồm 8 góc; CCCD ghi riêng 2 dòng nhãn "CCCD mặt trước/sau" (cột check-out để "—").
   - Dòng nổi bật: **"Mã xác thực biên bản: <sessionFingerprint>"**.
   - Ảnh không có hash → "—" và ghi chú "phiên tạo trước khi bật SHA-256".

## 2. Frontend
1. Component dùng chung **`IntegrityCheckPanel`** (sessionId):
   - Trạng thái ban đầu: dòng ngắn "Ảnh được gắn mã SHA-256 để chống chỉnh sửa" + nút **"Kiểm tra toàn vẹn"**.
   - Gọi `/integrity` → kết quả:
     - Tất cả khớp: khối xanh "✓ 18/18 ảnh khớp mã gốc – chưa bị chỉnh sửa" + mã xác thực biên bản (rút gọn, có nút sao chép đầy đủ).
     - Có `MISMATCH`: khối đỏ "⚠ n ảnh KHÔNG khớp mã gốc – có dấu hiệu bị thay đổi" + danh sách góc bị lệch (hash lưu vs hash hiện tại, rút gọn).
     - `MISSING_FILE` / `NO_HASH`: liệt kê riêng, màu vàng/xám, giải thích ngắn.
   - Nút "Kiểm tra lại".
2. Gắn panel vào: màn 09 (không hư hại), màn 11 (cột phải, dưới viewer hoặc cuối trang), màn 13 (biên bản) và màn 15 (hồ sơ bảo trì, cột phải).
   Không để panel che các nút hành động chính.
3. Viewer màn 11: dưới mỗi ảnh hiện mã rút gọn `SHA-256: ab12cd34…ef90` (có tooltip/nút sao chép mã đầy đủ).
4. Cập nhật `src/types/*`.

## Không làm
- Không mã hoá ảnh, không đổi bucket, không bắt buộc đăng nhập (ngoài phạm vi – ghi vào hạn chế).
- Không tính bù hash cho ảnh cũ (để `NO_HASH`).
- Không thêm endpoint/chức năng nào cho phép sửa ảnh hay hash qua API.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
1. Rebuild container `api` (có migration V7). Check-in + check-out 1 xe mới → `/results` có `sha256`/`checkInSha256` 64 ký tự.
2. "Kiểm tra toàn vẹn" → 18/18 khớp. PDF có mục "Xác thực toàn vẹn dữ liệu" + mã xác thực biên bản.
3. **Kiểm chứng độc lập**: tải 1 ảnh check-out về máy từ link `imageUrl`, chạy PowerShell
   `Get-FileHash .\anh.jpg -Algorithm SHA256` → phải trùng mã in trên PDF (so sánh không phân biệt hoa/thường).
4. **Giả lập giả mạo**: trên Supabase Dashboard → Storage → bucket → thư mục của phiên → tải 1 ảnh về, vẽ thêm 1 nét bằng Paint,
   upload đè đúng tên cũ (chọn ghi đè) → "Kiểm tra lại" → góc đó báo **KHÔNG khớp** màu đỏ. Upload lại ảnh gốc → khớp trở lại.
5. Phiên cũ (trước V7): panel báo `NO_HASH`, PDF ghi "—", không lỗi.
6. Màn hồ sơ bảo trì của xe không có check-out: không còn báo lỗi tải kết quả (mục 0).
Chạy `npm run build`, `npm run lint`, `./mvnw -q -DskipTests package` và các unit test mới.
