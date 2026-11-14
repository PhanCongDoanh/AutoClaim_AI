# AutoClaim AI – Module AI Check-out

```
autoclaim-ai/
├── kaggle/
│   ├── AutoClaim_Train_Kaggle.ipynb   ← upload lên Kaggle để train
│   └── prepare_dataset.py             ← (đã nhúng sẵn trong notebook)
├── ai-service/                        ← copy vào repo, ngang hàng backend/ và frontend/
│   ├── app.py         FastAPI: POST /api/ai/detect, GET /api/ai/status/{id}
│   ├── detector.py    YOLOv8-seg + SIFT/RANSAC + so khớp IoU + định vị bộ phận
│   ├── db.py          đọc/ghi PostgreSQL theo schema Flyway
│   ├── test_pair.py   test 1 cặp ảnh không cần backend
│   └── weights/       đặt damage_best.pt, parts_best.pt vào đây
└── backend-patch/
    └── V6__add_ai_status.sql
```

## 1. Train trên Kaggle

1. Tạo tài khoản Kaggle, **xác minh số điện thoại** (không có thì không bật được GPU/Internet).
2. *Create → New Notebook → File → Import Notebook* → chọn `AutoClaim_Train_Kaggle.ipynb`.
3. Cột phải: *Accelerator = GPU T4 x2*, *Internet = On*, *Add Input* → dataset hư hại xe (xem mục 6).
4. `SMOKE_TEST = True` → *Run All* (~5 phút) để chắc không lỗi.
5. `SMOKE_TEST = False` → *Save Version → Save & Run All (Commit)* → tắt máy đi ngủ.
6. Tab *Output* của version → tải `autoclaim_weights.zip` → giải nén vào `ai-service/weights/`.

Quota GPU miễn phí của Kaggle ~30 giờ/tuần, mỗi phiên tối đa 12 giờ – dư cho đồ án.
Google Colab free cũng được nhưng hay ngắt kết nối khi tab không hoạt động, nên Kaggle phù hợp hơn cho train dài.

## 2. Chạy AI service trên máy (CPU là đủ để suy luận)

```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu   # bản CPU, nhẹ hơn nhiều
pip install -r requirements.txt
copy .env.example .env      # rồi sửa DB_PASSWORD
uvicorn app:app --host 0.0.0.0 --port 5000
```

Mở http://localhost:5000/docs để thử API. Backend đã cấu hình sẵn `app.ai.detect-url=http://localhost:5000/api/ai/detect`
(Docker dùng `host.docker.internal:5000`). Trên macOS, cổng 5000 bị AirPlay Receiver chiếm → tắt AirPlay Receiver trong System Settings.

Test nhanh không cần backend:
```bash
python test_pair.py --before anh_nhan_xe.jpg --after anh_tra_xe.jpg --angle ANGLE_3
python test_pair.py --folder demo_xe1     # demo_xe1/before/ANGLE_1.jpg..., demo_xe1/after/ANGLE_1.jpg...
```
Ảnh so sánh lưu ở `out/` (đỏ = hư hại mới, xanh = đã có từ trước) – dùng luôn cho báo cáo/slide.

## 3. Luồng hoạt động

```
Frontend --8 ảnh--> Spring Boot  checkOut(): lưu S3 + inspection_images
                        |  POST /api/ai/detect {"sessionId"}   (202 ngay lập tức)
                        v
                  AI service (chạy nền)
                    1. Đợi transaction check-out commit (thấy đủ 8 ảnh)
                    2. Tìm phiên CHECK_IN cùng booking, ghép cặp theo angle_code
                    3. Mỗi cặp: YOLO trên Before (conf thấp) + After (conf cao)
                                SIFT + RANSAC homography: chiếu vết cũ sang ảnh mới
                                IoU >= 0.6 hoặc bị phủ >= 50%  → lỗi cũ, bỏ qua
                                còn lại                         → HƯ HẠI MỚI
                    4. INSERT damage_detections (chỉ hư hại mới), ai_status = DONE
Frontend poll GET /api/inspections/{sessionId}/results  → hiển thị → override → complete → PDF
```

Định dạng `bounding_box` ghi vào DB (toạ độ **chuẩn hoá 0..1** theo kích thước ảnh – frontend nhân với kích thước ảnh đang hiển thị):
```json
{"x":0.42,"y":0.51,"w":0.13,"h":0.09,"normalized":true,
 "polygon":[[0.42,0.51],[0.55,0.52],...], "matchIou":0.0, "aligned":true}
```
`damage_type` là tên lớp tiếng Anh (`dent`, `scratch`, `crack`, `glass_shatter`, `lamp_broken`, `tire_flat` với CarDD);
`part_name` đã là tiếng Việt. Map hiển thị cho frontend:
```ts
export const DAMAGE_LABELS: Record<string, string> = {
  scratch: 'Trầy xước', dent: 'Móp méo', crack: 'Nứt', glass_shatter: 'Vỡ kính',
  lamp_broken: 'Vỡ đèn', tire_flat: 'Xẹp lốp',
}
```

## 4. Sửa backend (nhỏ, nhưng nên làm)

**a) Gọi AI SAU khi commit** – hiện `triggerAiDetection()` chạy bên trong `@Transactional`, lúc đó ảnh chưa commit.
AI service đã tự đợi (tối đa 60s) nên vẫn chạy được, nhưng làm đúng thì sửa trong `InspectionServiceImpl.checkOut()`:
```java
// import org.springframework.transaction.support.TransactionSynchronization;
// import org.springframework.transaction.support.TransactionSynchronizationManager;
UUID newSessionId = session.getSessionId();
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override public void afterCommit() { triggerAiDetection(newSessionId); }
});
String statusMessage = "Check-out images saved successfully. AI is processing.";
```

**b) Trạng thái AI để frontend biết khi nào xong** (không có thì "0 hư hại" và "AI chưa chạy xong" trông giống nhau):
1. Copy `backend-patch/V6__add_ai_status.sql` vào `backend/src/main/resources/db/migration/`.
2. `InspectionSession.java`: `@Column(name = "ai_status", length = 20) private String aiStatus;`
3. Khi tạo phiên CHECK_OUT trong `checkOut()`: thêm `.aiStatus("PENDING")` vào builder.
4. `SessionResultResponseDto`: thêm field `String aiStatus`, và `.aiStatus(session.getAiStatus())` trong `getSessionResults()`.
5. Frontend: sau khi check-out, poll `GET /api/inspections/{sessionId}/results` mỗi 2 giây đến khi `aiStatus` là `DONE` hoặc `FAILED`.

AI service tự phát hiện cột `ai_status`: có thì ghi, chưa có thì bỏ qua – nên bước này làm lúc nào cũng được.

**c) PDF** – `ReportService` đang in nguyên chuỗi `bounding_box` vào cột "Bounding Box"; giờ chuỗi có thêm polygon nên rất dài.
Đổi cột đó thành "Độ tin cậy" (`String.format("%.0f%%", d.getConfidenceScore() * 100)`) giống mockup biên bản
(phần lọc bỏ các dòng `isOverridden = true` thì code hiện tại đã làm đúng).

**d) (Tuỳ chọn)** đặt timeout cho `RestTemplate` (vd. 5s) để AI treo không làm treo check-out.

## 5. Chỉnh ngưỡng khi test xe thật (sửa trong `.env`, không cần sửa code)

| Biến | Mặc định | Tăng lên khi | Giảm xuống khi |
|---|---|---|---|
| `CONF_AFTER` | 0.35 | báo nhầm nhiều (bóng, vết bẩn) | bỏ sót vết thật |
| `CONF_BEFORE` | 0.15 | — | vết cũ hay bị báo thành "mới" |
| `IOU_THR` | 0.6 (theo đề xuất) | — | vết cũ bị báo "mới" do căn chỉnh lệch |
| `CONTAIN_THR` | 0.5 | vết mới nằm cạnh vết cũ bị nuốt mất | vết cũ bị báo "mới" |
| `MIN_INLIERS` | 25 | căn chỉnh sai mà vẫn nhận là đúng | căn chỉnh hay thất bại |

`GET /api/ai/status/{sessionId}` trả về `perAngle` (căn chỉnh được không, số điểm khớp, số vết mới/cũ mỗi góc) để debug.

## 6. Dataset

- **CarDD** (Wang et al., 2023 – đã có trong tài liệu tham khảo của đề xuất): ~4.000 ảnh, 6 lớp có mask. Bản chính thức cần gửi
  form xin quyền ở trang của tác giả (có thể mất vài ngày), nên tìm bản đã upload trên Kaggle (*Add Input → tìm "CarDD"*) để bắt đầu ngay.
  Kiểm tra giấy phép của bản bạn dùng và trích dẫn paper trong báo cáo.
- **Roboflow Universe**: tìm "car damage segmentation", chọn bộ có nhãn **polygon** (không phải chỉ bounding box), export *YOLOv8*.
- Notebook tự nhận cả 2 định dạng (COCO và YOLO).
