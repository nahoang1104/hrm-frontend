# Quản lý nhân sự (HRM) — chỉ frontend

JS thuần, không backend. Chạy bằng web server tĩnh (`npx serve .` hoặc XAMPP), mở `index.html` qua http.

```
UI (js/app.js) → js/api/hr-api.js (nghiệp vụ + quyền) → js/api/store.js → IndexedDB (local) | window.kioStore (KIO)
```

- Thêm `?driver=local` vào URL (vd. `http://localhost:3000/?driver=local`) để chạy bằng IndexedDB, không đụng KIO.
- Mặc định lưu trên **KIO** (`https://kio.dvqt.vn`) qua `js/api/kio-api.js`, bảng prefix `hrm_`. Cần truy cập được kio.dvqt.vn.
- Tài khoản đầu tiên: `admin` / `Admin@12345` (đổi trong `index.html`), bắt đổi mật khẩu ở lần đăng nhập đầu.
- Quyền theo CLAUDE.md gốc (SUPER_ADMIN / HR_MANAGER / EMPLOYEE).

**Giới hạn:** không có server nên kiểm quyền chỉ là rào cản phía trình duyệt, ai mở DevTools đều vượt được. Dùng thật cần backend. File (ảnh, bằng cấp, chứng chỉ) được ghi vào thư mục `uploads/` trong source: lần đầu bấm **Thư mục uploads** ở menu và chọn đúng thư mục `uploads/` của dự án (Chrome/Edge, qua `http://localhost` hoặc https). DB chỉ lưu `path` dạng `uploads/{userId}/{type}/{tên-ngẫu-nhiên}`.
