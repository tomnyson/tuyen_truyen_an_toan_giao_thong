# Thiết kế: Seed data cho cổng tra cứu pháp luật

Ngày: 2026-07-31. Trạng thái: đã duyệt (người dùng chốt qua brainstorming).

## Mục tiêu

Trang chủ ("Tra cứu theo tình huống") có nội dung thật cho 3 chủ đề
Giao thông / Mạng xã hội / Sở hữu trí tuệ, và chatbot trả lời được các
câu hỏi phổ biến từ dữ liệu đã kiểm duyệt — kèm mức phạt và căn cứ khi
dữ liệu đủ điều kiện bốn mắt.

## Ngoài phạm vi

- Admin upload PDF luật (dân sự, hình sự) để hệ thống trích xuất: dự án
  con riêng, thiết kế sau. Hướng đã thống nhất: PDF → AI trích xuất bản
  nháp → duyệt bốn mắt → xuất bản (không cho AI trả lời thẳng từ PDF).
- NotebookLM: không có public API để gọi hỏi đáp. Tương đương gần nhất
  là Gemini API (File Search) hoặc stack OpenAI hiện có; sẽ cân nhắc
  trong thiết kế PDF ingestion.

## Nội dung seed

27 tình huống, 9 mỗi chủ đề. Mỗi tình huống là một cụm 4 bảng liên kết
trong D1.

**Giao thông** (căn cứ Nghị định 168/2024/NĐ-CP): mũ bảo hiểm; vượt đèn
đỏ; chở quá số người; đi ngược chiều; dùng điện thoại khi lái xe; không
gương chiếu hậu; độ tuổi lái xe và giao xe cho người chưa đủ tuổi; đi xe
trên vỉa hè; lạng lách đánh võng.

**Mạng xã hội** (Nghị định 15/2020/NĐ-CP sửa đổi bởi 14/2022, Luật An
ninh mạng 2018, Điều 32/34 Bộ luật Dân sự 2015): đăng/chia sẻ tin sai sự
thật; xúc phạm danh dự người khác; đăng ảnh người khác không xin phép;
để lộ thông tin cá nhân người khác; giả mạo tài khoản; lừa đảo trực
tuyến; quấy rối qua mạng; bán hàng quảng cáo sai; chia sẻ nội dung bạo
lực/nhạy cảm.

**Sở hữu trí tuệ** (Luật SHTT 2005 sửa đổi 2022, Nghị định 17/2023):
dùng phần mềm crack; đăng lại phim/nhạc; dùng ảnh trên mạng không xin
phép; đạo văn bài tập/đồ án; in áo nhân vật có bản quyền; mua bán hàng
nhái nhãn hiệu; đăng lại truyện scan; nhạc nền video; chép thiết kế
logo. Không trích Nghị định 131/2013 làm căn cứ trong `legal_basis` vì
`hasBlockedLegalBasis` (lib/legal-content.ts) chặn văn bản này.

### Cấu trúc dữ liệu mỗi tình huống

1. `legal_sources`: văn bản gốc — `document_number` (khóa tự nhiên,
   unique), tiêu đề, URL thật trên host allowlist (vbpl.vn,
   vbpl.moj.gov.vn, chinhphu.vn, *.chinhphu.vn — DB CHECK bắt buộc),
   `status='in_force'`, đủ `effective_from`, `last_verified_at`,
   `verified_by != created_by`.
2. `legal_provisions`: điều/khoản/điểm, `original_text` (trích văn bản
   gốc), `simplified_text` (diễn giải cho người 12–18 tuổi),
   `status='published'`, bốn mắt đầy đủ, `checksum_version =
   'provision-sha256-v1'` + `checksum_sha256` tính đúng thuật toán của
   lib/legal-evidence-retriever.ts (xác minh thuật toán khi triển khai).
3. `legal_entries`: thẻ trang chủ — topic (đúng 3 giá trị trong
   catalog-resolver TOPICS), icon, title, `legal_basis`, `penalty`,
   `remedy`, `case_study`, tags (JSON), `status='published'`,
   `review_status='four_eyes_verified'`, bốn mắt đầy đủ.
4. `legal_entry_citations`: gắn entry ↔ provision,
   `review_status='four_eyes_verified'`, đủ trường bốn mắt và checksum
   trích dẫn theo schema hiện hành.

Principal seed: `seed-editor` (tạo) và `seed-reviewer` (duyệt) — hai giá
trị khác nhau để thỏa mọi CHECK bốn mắt. Dữ liệu ở trạng thái published
ngay sau khi seed (quyết định của người dùng, phục vụ dev/demo).
Trước khi dùng cho production, người vận hành rà lại nội dung — đặc
biệt các con số mức phạt.

## Cơ chế seed

Hai file mới, không sửa code app:

- `db/seeds/seed-content.v1.mjs`: file dữ liệu thuần (object JS, không
  phụ thuộc thư viện). Nơi duy nhất chứa nội dung để rà soát pháp lý.
- `scripts/seed-d1.mjs`: đọc file trên → validate hình dạng (topic hợp
  lệ, URL đúng host, không dính blocklist, trường bắt buộc đủ) → tính
  checksum → sinh một transaction SQL idempotent.

Khóa idempotent: sources theo `document_number`; entries theo
(topic, title); provisions theo (source, article, clause, point);
citations theo cặp entry–provision. Dùng `INSERT ... WHERE NOT EXISTS`
(hoặc tương đương) — chạy lại không nhân đôi, không đụng dữ liệu fixture
hay dữ liệu admin tự tạo.

Chế độ chạy (npm scripts):

- `npm run seed`: áp vào D1 local (tự tìm file sqlite miniflare trong
  `.wrangler/state/v3/d1`, áp bằng sqlite3 CLI).
- `npm run seed -- --sql-only`: chỉ xuất `db/seeds/seed.v1.sql` để chạy
  production qua `wrangler d1 execute DB --remote --file`.

Xử lý lỗi: fail-fast trong transaction — một câu lỗi là rollback toàn
bộ, in lỗi sqlite nguyên văn. CHECK constraint + trigger của DB là chốt
gác cuối; script không tắt trigger, không dùng PRAGMA nới lỏng.

## Thay đổi code duy nhất: chat hiện mức phạt khi đủ bốn mắt

`findManagedAnswer` (lib/legal-chat.ts): sau khi match entry tốt nhất,
truy vấn citations của entry. Chỉ khi entry có ≥1 citation
`four_eyes_verified` trỏ tới provision `published` thuộc source
`in_force` đã xác minh:

- thêm section căn cứ pháp lý (tái dùng helper
  `reviewedCitationsToLegalBasisSection` trong
  lib/chat-answer-presentation.ts);
- hiển thị `penalty` của entry trong phần chi tiết;
- bỏ câu giới hạn "Chưa hiển thị căn cứ và mức xử lý…".

Không đạt điều kiện → giữ nguyên hành vi hiện tại (fail-closed). Không
thay đổi nào khác trong luồng chat (curated, reviewed-web, web search
giữ nguyên).

## Kiểm thử

- Unit (node --test, theo pattern tests/ hiện có):
  - script sinh SQL: checksum đúng chuẩn; idempotent (áp 2 lần vào
    sqlite tạm = 1 bộ dữ liệu); không có `legal_basis` dính blocklist;
    mọi URL thuộc host allowlist; đủ 27 tình huống đúng 3 topic.
  - `findManagedAnswer` mở rộng: có citation bốn mắt → hiện căn cứ +
    mức phạt; không có → giữ câu giới hạn cũ (mock DB rows).
- Integration: áp migrations 0000→0006 + seed vào sqlite tạm; assert số
  bản ghi, `PRAGMA integrity_check` và `foreign_key_check` sạch; truy
  vấn match thử "mũ bảo hiểm" ra đúng entry.
- E2E tay: dev server — trang chủ hiện thẻ theo 3 chủ đề; chat trả lời
  "không đội mũ bảo hiểm phạt bao nhiêu" kèm mức phạt và căn cứ; câu
  ngoài phạm vi seed vẫn rơi xuống web search như cũ.

## Tiêu chí thành công

1. `npm run seed` chạy sạch trên D1 local mới lẫn D1 đã có dữ liệu.
2. Trang chủ: mỗi chủ đề ≥9 thẻ nội dung thật.
3. Chat: ≥1 câu hỏi mỗi chủ đề được trả lời từ dữ liệu seed, có mức
   phạt + căn cứ + nguồn vbpl.vn/chinhphu.vn.
4. Toàn bộ test hiện có của repo vẫn xanh.
