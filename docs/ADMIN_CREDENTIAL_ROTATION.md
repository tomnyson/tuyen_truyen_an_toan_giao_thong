# Runbook — Tạo và xoay credential quản trị

Runbook này áp dụng cho credential một admin hiện tại của US-018. Nó không tạo
user registry, RBAC hoặc stateful session.

## Cấu hình bắt buộc

Runtime chỉ đọc ba biến server-side:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET` có ít nhất 32 ký tự

`ADMIN_PASSWORD` plaintext không được hỗ trợ và bị bỏ qua. Thiếu một biến,
session secret quá ngắn hoặc hash sai format đều làm login fail closed với cùng
response 401 chung.

Hash có format cố định:

```text
v1$pbkdf2-sha256$600000$<salt-base64url-16-byte>$<digest-base64url-32-byte>
```

## Tạo hash

Chạy trong terminal tương tác ở máy tin cậy:

```bash
npm run auth:hash
```

Script yêu cầu nhập hai lần, không echo mật khẩu và chỉ chấp nhận mật khẩu ít
nhất 16 ký tự. Kết quả được in một lần để người vận hành copy vào secret
manager. Không truyền mật khẩu qua command-line argument, không commit
`.env.local`, không dán password/hash/session secret vào issue, tài liệu hoặc
application log.

## Xoay credential

1. Xác nhận có quyền cập nhật secret manager, quyền deploy và một cửa sổ kiểm
   tra login.
2. Chạy `npm run auth:hash` để tạo hash mới.
3. Tạo `ADMIN_SESSION_SECRET` ngẫu nhiên mới, tối thiểu 32 ký tự. Thay đổi secret
   này cùng đợt để mọi cookie phiên cũ mất hiệu lực.
4. Cập nhật `ADMIN_PASSWORD_HASH` và `ADMIN_SESSION_SECRET` trong secret manager;
   không thêm plaintext `ADMIN_PASSWORD`.
5. Deploy cùng artifact đã qua kiểm thử.
6. Smoke test: mật khẩu cũ trả 401, mật khẩu mới tạo session mới, cookie cũ
   không mở được `/admin`, cookie mới mở được.
7. Theo dõi tỷ lệ lỗi và latency login. PBKDF2 600.000 vòng phải được benchmark
   trên Worker production-like trước cutover; không tự giảm iteration mà không
   tạo version/policy mới và qua security review.

## Rollback

- Rollback artifact nếu release có regression, nhưng giữ runtime fail-closed và
  không quay lại code đọc plaintext.
- Nếu cần khôi phục hash trước đó, đồng thời phát hành một
  `ADMIN_SESSION_SECRET` mới khác nữa. Không khôi phục session secret cũ vì có
  thể làm cookie chưa hết hạn hoạt động trở lại.
- Lặp lại smoke test ở bước 6 và ghi nhận thời gian/operator của thay đổi trong
  hệ thống audit vận hành; không ghi giá trị secret/hash.
