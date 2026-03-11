# 📊 Hướng Dẫn Tạo Google Sheets — Positive Jar HRM

## Bước 1: Tạo Google Sheets mới
1. Mở [Google Sheets](https://sheets.google.com)
2. Tạo bảng tính mới, đặt tên: **"Positive Jar - HRM"**

## Bước 2: Tạo 8 tabs

Đổi tên tab mặc định và tạo thêm 7 tab với tên CHÍNH XÁC sau:
```
employees | attendance | schedules | daily_reports | product_lines | production_orders | task_assignments | settings
```

---

## Bước 3: Điền dữ liệu cho từng tab

### Tab 1: `employees`
**Headers (Row 1):**
```
id | name | phone | type | skills | hourly_rate | status | joined_date | notes
```

**Dữ liệu mẫu (Row 2-11):**
```
EMP001 | Nguyễn Văn An    | 0901234567 | fulltime  | printing,cutting,assembly      | 50000  | active | 2024-01-15 | Nhân viên kỳ cựu
EMP002 | Trần Thị Bình    | 0912345678 | fulltime  | printing,quality_check,packing | 55000  | active | 2024-02-01 | Tổ trưởng in ấn
EMP003 | Lê Hoàng Cường   | 0923456789 | parttime  | cutting,assembly               | 40000  | active | 2024-03-10 | Làm buổi sáng
EMP004 | Phạm Thị Dung    | 0934567890 | fulltime  | assembly,quality_check,packing | 52000  | active | 2024-01-20 | Chuyên đóng gói
EMP005 | Hoàng Văn Em     | 0945678901 | seasonal  | materials,cutting              | 35000  | active | 2024-06-01 | Thời vụ mùa cao điểm
EMP006 | Ngô Thị Phương   | 0956789012 | fulltime  | printing,cutting,quality_check | 53000  | active | 2024-04-15 | Đa kỹ năng
EMP007 | Vũ Minh Quang    | 0967890123 | parttime  | packing,delivery               | 38000  | active | 2024-05-20 | Ca chiều
EMP008 | Đặng Thị Hương   | 0978901234 | fulltime  | assembly,packing,delivery      | 50000  | active | 2024-02-10 | Nhóm giao hàng
EMP009 | Bùi Văn Khải     | 0989012345 | seasonal  | materials,assembly             | 35000  | active | 2024-07-01 | Thời vụ
EMP010 | Lý Thị Lan       | 0990123456 | parttime  | quality_check,packing          | 42000  | inactive | 2024-03-01 | Tạm nghỉ
```

---

### Tab 2: `attendance`
**Headers (Row 1):**
```
id | employee_id | employee_name | date | shift | check_in | check_out | lunch_break_minutes | work_hours | overtime_hours | status | note
```
*(Để trống - data sẽ được tạo khi nhân viên check-in/out)*

---

### Tab 3: `schedules`
**Headers (Row 1):**
```
id | employee_id | employee_name | date | shift | status | approved_by | reject_reason | note | created_at
```
*(Để trống - data sẽ được tạo khi nhân viên đăng ký lịch)*

---

### Tab 4: `daily_reports`
**Headers (Row 1):**
```
id | employee_id | employee_name | date | order_id | order_code | product_line | stage_name | quantity_completed | quality_notes | issues | created_at
```
*(Để trống - data sẽ được tạo khi nhân viên báo cáo)*

---

### Tab 5: `product_lines`
**Headers (Row 1):**
```
id | name | icon | color | amazon_sku_prefix | is_active
```

**Dữ liệu (Row 2-7):**
```
PL001 | Positive Jar - Affirmation  | ✨ | #E8A87C | PJ-AFF | TRUE
PL002 | Positive Jar - Gratitude    | 🙏 | #85CDCA | PJ-GRA | TRUE
PL003 | Positive Jar - Motivation   | 🔥 | #D4A5A5 | PJ-MOT | TRUE
PL004 | Positive Jar - Love Notes   | 💜 | #C9B1FF | PJ-LOV | TRUE
PL005 | Positive Jar - Mindfulness  | 🧘 | #9ED2C6 | PJ-MND | TRUE
PL006 | Positive Jar - Kids Edition | 🌈 | #FFD93D | PJ-KID | TRUE
```

---

### Tab 6: `production_orders`
**Headers (Row 1):**
```
id | order_code | product_line_id | product_line_name | quantity | current_stage | total_stages | deadline | priority | status | notes | created_at | completed_at
```

**Dữ liệu mẫu (Row 2-6):**
```
ORD001 | ORD-2026-001 | PL001 | Positive Jar - Affirmation | 500  | 5 | 7 | 2026-03-20 | high   | in_progress | Đơn Amazon khẩn          | 2026-03-01 |
ORD002 | ORD-2026-002 | PL002 | Positive Jar - Gratitude   | 300  | 3 | 7 | 2026-03-25 | medium | in_progress | Đơn định kỳ              | 2026-03-05 |
ORD003 | ORD-2026-003 | PL004 | Positive Jar - Love Notes  | 200  | 1 | 7 | 2026-04-01 | low    | pending     | Đơn Valentine trễ        | 2026-03-08 |
ORD004 | ORD-2026-004 | PL006 | Positive Jar - Kids Edition| 1000 | 6 | 7 | 2026-03-15 | urgent | in_progress | Giao gấp cho đối tác     | 2026-02-20 |
ORD005 | ORD-2026-005 | PL003 | Positive Jar - Motivation  | 400  | 2 | 7 | 2026-03-30 | medium | in_progress | Đơn bổ sung FBA          | 2026-03-07 |
```

---

### Tab 7: `task_assignments`
**Headers (Row 1):**
```
id | order_id | order_code | product_line_name | stage_number | stage_name | employee_id | employee_name | date | target_quantity | status | notes
```
*(Để trống - data sẽ được tạo khi admin phân công việc)*

---

### Tab 8: `settings`
**Headers (Row 1):**
```
key | value | description
```

**Dữ liệu (Row 2-15):**
```
lunch_break_morning    | 60    | Nghỉ trưa ca sáng (phút)
lunch_break_afternoon  | 0     | Nghỉ trưa ca chiều (phút)
lunch_break_night      | 0     | Nghỉ trưa ca tối (phút)
morning_shift_start    | 06:00 | Bắt đầu ca sáng
morning_shift_end      | 14:00 | Kết thúc ca sáng
afternoon_shift_start  | 14:00 | Bắt đầu ca chiều
afternoon_shift_end    | 22:00 | Kết thúc ca chiều
night_shift_start      | 22:00 | Bắt đầu ca tối
night_shift_end        | 06:00 | Kết thúc ca tối
late_threshold_minutes | 15    | Phút cho phép trễ
overtime_rate          | 1.5   | Hệ số lương OT
standard_hours         | 8     | Giờ làm chuẩn/ca
company_name           | Positive Jar | Tên công ty
stages_list            | Nguyên liệu,In ấn,Cắt,Lắp ráp,Kiểm tra CL,Đóng gói,Giao hàng | 7 công đoạn
```

---

## Bước 4: Format
1. **Bold** hàng header (Row 1) cho tất cả tabs
2. **Freeze Row 1** cho tất cả tabs: View → Freeze → 1 row
3. **Auto-resize** các cột: chọn tất cả → Format → Column width → Fit to data
4. **Alternating colors**: Format → Alternating colors → chọn màu nhẹ

## Bước 5: Lưu Sheet ID
- Copy URL dạng: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
- **SHEET_ID_HERE** sẽ dùng trong Apps Script

---

⏱️ **Thời gian ước tính: 15 phút**
