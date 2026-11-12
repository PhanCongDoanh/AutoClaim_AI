# Đợt 3 – Luồng 2: CÓ hư hại → duyệt → biên bản PDF → Bảo trì

Đọc `CLAUDE.md`, `BAO-CAO-DOT-0.md`, xem mockup `11` → `14` trong `docs/ui-mockups/`.
Đợt 2 đã có điều hướng màn kết quả; đợt này thay placeholder "có hư hại" bằng màn 11 đầy đủ.
Lập kế hoạch → **chờ tôi OK** → làm.

## Màn 11 – Kết quả có hư hại (`11_Ket-qua_Co-hu-hai.png`)
- Banner đỏ: "Phát hiện **n** hư hại mới so với lúc check-in" + hướng dẫn xoá lỗi AI nhầm.
- **Cột trái – danh sách hư hại** (chỉ hư hại chưa override), mỗi thẻ: `#i`, "<nhãn loại> · <part_name>",
  "Góc k · <tên góc>", thanh "Độ tin cậy của AI" (%), nút "Xoá (AI nhầm)". Bấm thẻ → chọn hư hại, viewer chuyển tới góc đó.
  Bên dưới: mục thu gọn "Đã loại (m)" liệt kê hư hại đã override kèm lý do.
- **Cột phải – viewer**: tiêu đề "Góc k · <tên góc>" + chip hư hại đang chọn; công tắc chế độ
  **"Song song" (mặc định)** | "Trượt so sánh"; nút phóng to (mở `Dialog` toàn màn hình).
  - Song song: ảnh check-in (trái, nhãn "CHECK-IN · dd/MM HH:mm") và ảnh check-out (phải, nhãn đỏ "CHECK-OUT · dd/MM HH:mm").
  - Trượt so sánh: 2 ảnh chồng nhau, kéo thanh chia dọc.
  - **Overlay hư hại trên ảnh check-out**: SVG phủ đúng vùng ảnh hiển thị (tính theo tỉ lệ khung hình thật của ảnh,
    không lệch khi ảnh `object-contain`), vẽ `polygon` từ `bounding_box` (toạ độ 0..1; thiếu polygon → vẽ chữ nhật x,y,w,h),
    viền + nền đỏ mờ, nhãn "<loại> <độ tin cậy>%". Hư hại đang chọn tô đậm hơn.
  - Nếu `bounding_box.aligned === false`: dòng cảnh báo vàng "Góc chụp lệch nhiều so với lúc check-in – hãy kiểm tra kỹ bằng mắt".
  - Dải 8 ảnh thu nhỏ ở dưới, đánh số góc, **chấm đỏ** ở góc có hư hại chưa override; bấm để đổi góc.
- Parse `boundingBox` (chuỗi JSON) an toàn trong một util có kiểu rõ ràng; JSON hỏng → bỏ qua overlay, không crash.

## Màn 12 – Xoá lỗi AI nhầm (`12_Ket-qua_Xoa-loi-AI-nham.png`)
- `AlertDialog`: "Xoá lỗi do AI nhận nhầm?", tên hư hại "#i <loại> · <vị trí> sẽ bị loại khỏi biên bản".
- Lý do (radio): "Bóng phản chiếu / ánh sáng", "Bụi bẩn, vết nước", "Hư hại đã có từ trước", "Lý do khác"
  (chọn → hiện ô nhập, bắt buộc). Nút "Huỷ" / "Có, xoá lỗi này" → `PATCH /override` với `overrideReason`.
- Thành công: cập nhật state tại chỗ (không reload cả trang), toast ngắn. **Khi số hư hại còn lại về 0 → tự chuyển sang màn 09**
  (không hư hại, nút "Hoàn tất trả xe").

## Thanh hành động màn 11
- Trái: "⚠ n hư hại mới · Xe sẽ chuyển sang tab **Bảo trì**" (n cập nhật theo override).
- Phải: **chỉ một nút** "Xuất PDF & Chuyển sang Bảo trì" (**không** có "Lưu nháp") → `AlertDialog` xác nhận →
  `POST /complete` → chuyển sang màn 13.

## Màn 13 – Biên bản đã tạo (`13_Bien-ban-PDF.png`)
- Stepper 4 bước (thêm "Xuất PDF"). Xem trước PDF thật: tải `GET /report` dạng Blob → `URL.createObjectURL` → `<iframe>`
  (thu hồi URL khi rời trang).
- Nút "Tải PDF" và "Về tab Bảo trì" (**không** có "Gửi khách").
- "Về tab Bảo trì" → dashboard mở tab "Bảo trì" + toast "Đã xuất biên bản PDF – <xe> · <biển số> đã chuyển sang tab Bảo trì"
  kèm hành động "Tải lại PDF" (mockup 14).

## Backend – thêm ảnh vào PDF (`ReportService`)
- Với mỗi góc có hư hại chưa override: chèn ảnh check-out của góc đó (tải từ URL lưu trữ, thu nhỏ ~ nửa trang),
  chú thích "Góc k · <tên góc>". Sắp 2 ảnh/hàng như mockup.
- **Tuỳ chọn – chỉ làm nếu gọn gàng**: vẽ polygon đỏ + nhãn lên ảnh bằng Java2D trước khi chèn. Nếu làm, tách thành
  hàm riêng và báo tôi; không làm được thì để ảnh trơn.
- Tải ảnh lỗi → bỏ qua ảnh đó, PDF vẫn tạo được.

## Kiểm tra cuối đợt (viết hướng dẫn cho tôi)
Dùng bộ ảnh tổng hợp `anh_test_tong_hop.zip` (tạo từ notebook Kaggle): check-in bằng `xe1_hu_hai_moi/before/ANGLE_1..8`,
check-out bằng `xe1_hu_hai_moi/after/ANGLE_1..8` →
1. Màn 11 hiện đúng số hư hại, overlay nằm đúng vị trí trên ảnh, đổi góc/chọn hư hại mượt, 2 chế độ xem hoạt động.
2. Xoá 1 lỗi với "Lý do khác" → số hư hại giảm, mục "Đã loại" có lý do.
3. Xuất PDF → màn 13 xem được PDF, tiếng Việt đúng, có ảnh → về tab Bảo trì thấy xe.
4. Lặp lại một phiên khác, xoá **hết** lỗi → tự chuyển màn 09 → Hoàn tất → xe về Sẵn sàng.
`npm run build`, `npm run lint`, backend package đều sạch.
