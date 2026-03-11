# 🚀 Positive Jar — Deployment Guide

## Bước 1: Tạo Google Sheets
Xem file **google-sheets-setup-guide.md** để tạo Google Sheet với 8 tabs.

## Bước 2: Deploy Apps Script
1. Mở Google Sheet vừa tạo → Extensions → Apps Script
2. Copy toàn bộ nội dung **apps-script/Code.gs** vào editor
3. Deploy → New deployment → Web app
4. Execute as: **Me** | Who has access: **Anyone**
5. Copy URL deploy

## Bước 3: Cấu hình .env.local
Thay `YOUR_APPS_SCRIPT_URL_HERE` trong cả 2 file:
- `positive-jar-worker/.env.local`
- `positive-jar-admin/.env.local`

## Bước 4: Test Local
```bash
# Worker app (port 3000)
cd positive-jar-worker && npm run dev

# Admin app (port 3001)
cd positive-jar-admin && npm run dev -- -p 3001
```

## Bước 5: Deploy lên Vercel (khuyến nghị)
```bash
npm i -g vercel

# Deploy Worker App
cd positive-jar-worker
vercel --prod

# Deploy Admin App
cd positive-jar-admin
vercel --prod
```

## ✅ Test Checklist
- [ ] Google Sheet có đủ 8 tabs + đúng headers
- [ ] Apps Script deploy thành công
- [ ] Worker: Hiện danh sách NV
- [ ] Worker: Check-in → hoạt động
- [ ] Worker: Check-out → tính giờ đúng
- [ ] Worker: Báo cáo → gửi thành công
- [ ] Worker: Đăng ký lịch
- [ ] Admin: Dashboard hiện stats
- [ ] Admin: Bảng công → xem dữ liệu
- [ ] Admin: Duyệt lịch → approve/reject
- [ ] Admin: Phân công việc
- [ ] Admin: Production kanban
- [ ] Admin: Thêm/sửa nhân viên
- [ ] Admin: Settings → lưu thành công
