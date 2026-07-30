# Luật Học Đường

Cổng tra cứu pháp luật dành cho học sinh, gồm bảng tình huống, nguồn văn bản
chính thức và chatbot hỏi đáp tiếng Việt.

## Chạy cục bộ

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Các biến môi trường được mô tả trong `.env.example`. Sao chép chúng vào
`.env.local`; không commit secret. Runtime hiện dùng `ADMIN_PASSWORD` dạng
plaintext từ secret manager, chưa hỗ trợ `ADMIN_PASSWORD_HASH`. Không dùng
credential mặc định như `admin/admin` trong production.

## Kiểm tra

```bash
npm run lint
npx tsc --noEmit
npm test
```

`npm test` build ứng dụng rồi kiểm tra trang công khai và các nhánh an toàn của
chatbot.

## Quản trị nội dung

Mở `/admin/login` và đăng nhập bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Phiên
đăng nhập được ký bằng `ADMIN_SESSION_SECRET` và lưu trong cookie `HttpOnly`.
Dashboard cho phép tạo, sửa, xóa và xuất bản điều luật hoặc case study. Nội dung
CMS có trạng thái `published` được đưa vào trang công khai và được chatbot dùng
cho retrieval. Câu hỏi không khớp kho nội dung trả `unavailable`; AI provider
đang bị vô hiệu cho tới khi có evidence bundle và output validation theo
DEC-002. Runtime hiện chưa có bước reviewer độc lập, nên `published` chưa đồng
nghĩa với “đã kiểm duyệt chuyên môn”.

## Cấu trúc chính

- `app/page.tsx`: giao diện tra cứu và chatbot.
- `app/api/chat/route.ts`: API hỏi đáp, ưu tiên dữ liệu CMS đã `published`.
- `app/admin/`: đăng nhập và dashboard quản trị.
- `db/`: schema D1 và migration cho nội dung quản trị.
- `docs/TECHNICAL_SPEC.md`: kiến trúc hiện tại, kiến trúc citation-first đích,
  API/data model, migration, bảo mật và Definition of Done.
- `tests/rendered-html.test.mjs`: regression tests của trang và API.
- `.openai/hosting.json`: cấu hình Sites.
- `vercel.json`: cấu hình build bản public trên Vercel; CMS/D1 chưa có storage
  adapter tương đương trên target này.

Nội dung trên website phục vụ giáo dục, không thay thế tư vấn pháp lý cho vụ
việc cụ thể.
