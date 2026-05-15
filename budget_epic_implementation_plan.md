# Kế hoạch triển khai Epic: E-05 Quản lý Ngân sách (Budget Management)

Dựa trên hình ảnh bảng Jira và tài liệu đặc tả, phần việc của bạn thuộc **Epic E-05 (Quản lý ngân sách)** gồm **4 đầu việc lớn (Jira Stories)** với tổng cộng **16 điểm Story Points**. 

Dưới đây là kế hoạch chi tiết, đề xuất thiết kế Cơ sở dữ liệu và danh sách **tên các nhánh Git** bạn nên tạo để bắt tay thực hiện một cách chuyên nghiệp.

---

## 🖼️ 1. Giao diện trực quan từ Stitch Design Board

Chúng ta đã mở thành công bảng vẽ thiết kế Stitch và lưu lại các màn hình thiết kế để làm tư liệu trực quan. Dưới đây là các màn hình bạn sẽ hiện thực hóa:

### Màn hình 1: Dashboard Ngân sách & Tiến độ Chi tiêu
Màn hình chính hiển thị vòng tròn tiến độ tổng quan (Total Circular Ring), thẻ AI Gợi ý màu xanh lục, và danh sách các thanh tiến độ (Progress Bars) cho từng danh mục kèm cảnh báo in-app.
![Dashboard Ngân sách & Tiến độ Chi tiêu](C:/Users/tranh/.gemini/antigravity/brain/ba70ba77-04bd-4632-b73b-5aae131483a6/stitch_design_screen1.png)

### Màn hình 2: Form Thêm/Chỉnh sửa Ngân sách
Màn hình phụ hiển thị ô nhập số tiền siêu lớn với đường gạch dưới phát sáng neon, lưới chọn danh mục (Ăn uống, Di chuyển,...) và bộ bàn phím số (Custom NumPad) tích hợp sẵn ở nửa dưới.
![Form Thêm/Chỉnh sửa Ngân sách](C:/Users/tranh/.gemini/antigravity/brain/ba70ba77-04bd-4632-b73b-5aae131483a6/stitch_design_screen2.png)

---

## 🗄️ 2. Thiết kế Mô hình Cơ sở dữ liệu (Prisma Schema)
Để thực hiện tính năng này, bạn cần bổ sung bảng `budgets` vào file `schema.prisma`. 

```prisma
model Budget {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  categoryId   Int       @map("category_id")
  amount       Decimal   @db.Decimal(15, 0)
  startDate    DateTime  @map("start_date") @db.Date // Ngày bắt đầu chu kỳ ngân sách (VD: 2026-05-01)
  endDate      DateTime  @map("end_date") @db.Date   // Ngày kết thúc chu kỳ (VD: 2026-05-31)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime? @updatedAt @map("updated_at") @db.Timestamp(6)

  // Các quan hệ
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category     Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId, startDate]) // Mỗi category của 1 user chỉ có 1 ngân sách trong 1 khoảng thời gian
  @@map("budgets")
}
```

---

## 🛠️ 3. Chi tiết 4 Stories và Danh sách nhánh Git cần tạo

### 1️⃣ SMM-152: [BUD] Set Monthly Budget per Category (3 SP)
*Mục tiêu:* Cho phép thiết lập mức ngân sách tối đa hàng tháng cho từng danh mục.
* **Các nhánh Git bạn cần tạo và làm:**
  * 🌿 **`feat/smm-152/design-budget-setting-screen`**
    * *Mô tả:* Thiết kế giao diện danh sách danh mục chi tiêu kèm ô nhập số tiền trực tiếp (inline input).
    * *Tác vụ con:* Thiết kế UI màn hình thiết lập, nút Lưu và hiển thị tổng ngân sách ở góc cuối.
  * 🌿 **`feat/smm-152/build-POST-PATCH-budgets-api`**
    * *Mô tả:* Xây dựng API lưu/cập nhật ngân sách ở backend Express.
    * *Tác vụ con:* Xây dựng endpoint `POST /budgets`, kiểm tra hợp lệ dữ liệu (số tiền dương), lưu vào bảng `budgets`.
  * 🌿 **`feat/smm-152/implement-budget-inputs-and-calculation`**
    * *Mô tả:* Tích hợp chức năng nhập liệu, kiểm tra dữ liệu và tính toán tổng số tiền ngân sách trên Mobile.

---

### 2️⃣ SMM-158: [BUD] Real-time Budget Progress Tracking (5 SP)
*Mục tiêu:* Theo dõi % chi tiêu thực tế so với ngân sách theo thời gian thực.
* **Các nhánh Git bạn cần tạo và làm:**
  * 🌿 **`feat/smm-158/build-GET-budgets-progress-api`**
    * *Mô tả:* Xây dựng API tính toán tiến độ ngân sách ở backend.
    * *Tác vụ con:* Endpoint `GET /budgets/progress` thực hiện truy vấn JOIN giữa bảng ngân sách và các giao dịch trong tháng đó để trả về: *ngân sách gốc, số tiền đã chi, số tiền còn lại*.
  * 🌿 **`feat/smm-158/design-budget-progress-card`**
    * *Mô tả:* Thiết kế component thanh tiến độ (Progress Bar) đổi màu thông minh trên Mobile.
    * *Tác vụ con:* Màu xanh lục (`<80%`), vàng (`80-99%`), đỏ cảnh báo (`>=100%`).
  * 🌿 **`feat/smm-158/implement-realtime-budget-tracking`**
    * *Mô tả:* Đồng bộ hóa tiến độ. Tự động reload / cập nhật lại thanh tiến độ ngay khi có giao dịch mới được tạo.

---

### 3️⃣ SMM-163: [BUD] Budget Alert Notifications (In-App) (3 SP)
*Mục tiêu:* Đưa ra cảnh báo trực quan trong ứng dụng khi chi tiêu sắp vượt hoặc đã vượt hạn mức.
* **Các nhánh Git bạn cần tạo và làm:**
  * 🌿 **`feat/smm-163/implement-budget-threshold-check`**
    * *Mô tả:* Viết hàm logic kiểm tra phần trăm ngân sách đã tiêu ngay sau khi lưu giao dịch.
  * 🌿 **`feat/smm-163/design-in-app-alert-banner`**
    * *Mô tả:* Thiết kế Banner cảnh báo dạng nổi (Toast/Banner) hiển thị trên màn hình Dashboard và Budget.
    * *Tác vụ con:* Trạng thái cảnh báo màu vàng (chạm 80%) và màu đỏ (chạm hoặc vượt 100%).
  * 🌿 **`feat/smm-163/implement-alert-dismiss-session`**
    * *Mô tả:* Logic tắt tạm thời cảnh báo (dismiss) lưu vào bộ nhớ tạm để không quấy rầy người dùng liên tục.

---

### 4️⃣ SMM-168: [BUD] AI-Suggested Budget Amounts (5 SP)
*Mục tiêu:* Tích hợp trí tuệ nhân tạo AI gợi ý ngân sách chi tiêu tối ưu dựa trên thói quen lịch sử.
* **Các nhánh Git bạn cần tạo và làm:**
  * 🌿 **`feat/smm-168/build-POST-ai-budget-suggest-api`**
    * *Mô tả:* Xây dựng API phân tích chi tiêu bằng AI ở backend.
    * *Tác vụ con:* Thu thập dữ liệu chi tiêu 3 tháng gần nhất của người dùng làm context, truyền vào LLM (Gemini/OpenAI) để nhận về gợi ý dạng JSON kèm lời giải thích ngắn gọn.
  * 🌿 **`feat/smm-168/design-ai-suggestion-review-ui`**
    * *Mô tả:* Màn hình xem trước gợi ý ngân sách của AI trên Mobile.
    * *Tác vụ con:* Thiết kế nút "Gợi ý từ AI", hiển thị danh sách đề xuất kèm nút chấp nhận (Auto-fill) hoặc bỏ qua đối với từng danh mục.
