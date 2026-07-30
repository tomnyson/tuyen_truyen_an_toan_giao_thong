# User Stories — Luật Học Đường

> Cập nhật gần nhất: 2026-07-31
> Quy ước: checkbox ở tiêu đề chỉ được đánh dấu `[x]` khi tất cả acceptance
> criteria của story đã có bằng chứng. Story chưa hoàn tất có thể có một số
> acceptance criteria con đã được đánh dấu.

## Epic A — Tra cứu và hiểu pháp luật

### [x] US-001 — Tra cứu nội dung theo từ khóa và chủ đề

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn tìm và lọc các tình huống pháp luật gần gũi
  để nhanh chóng thấy nội dung liên quan.

**Acceptance criteria**

- [x] Có bộ lọc ba chủ đề MVP và lựa chọn xem tất cả.
- [x] Tìm kiếm trên tiêu đề, căn cứ, chủ đề và tags.
- [x] Tìm kiếm không phân biệt dấu tiếng Việt.
- [x] Có trạng thái không tìm thấy và thao tác đặt lại.

**Evidence:** `app/page.tsx`, `lib/legal-content.ts`

### [x] US-002 — Xem căn cứ, mức xử lý và tình huống minh họa

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn mở một kết quả để xem căn cứ, mức xử lý tham
  khảo và ví dụ dễ hiểu.

**Acceptance criteria**

- [x] Danh sách hiển thị hành vi, căn cứ dạng text, mức phạt và khắc phục.
- [x] Modal chi tiết hiển thị căn cứ, mức phạt và case study.
- [x] Có lưu ý nội dung giáo dục, không phải hồ sơ xử phạt thực tế.

**Evidence:** `app/page.tsx`, `lib/legal-content.ts`

### [ ] US-003 — Mở nguồn chính thức từ từng dẫn chứng

- **Priority:** P0
- **Persona:** Học sinh, phụ huynh, giáo viên
- **Mô tả:** Là người đọc, tôi muốn mở đúng nguồn chính thức tương ứng với căn cứ
  trong câu trả lời để tự kiểm chứng.

**Acceptance criteria**

- [x] Trang public có danh sách URL nguồn tham khảo chính thức.
- [ ] Mỗi căn cứ được lưu thành record có liên kết đến source record.
- [ ] Mỗi câu trả lời hiển thị link chính thức ngay cạnh citation tương ứng.
- [ ] Citation hiển thị điều/khoản/điểm, hiệu lực và ngày kiểm chứng gần nhất.

**Evidence hiện có:** `lib/legal-content.ts`, `app/page.tsx`

### [ ] US-004 — Nhận câu trả lời đầy đủ và có cấu trúc

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn mỗi câu trả lời có kết luận, giải thích, căn
  cứ, ví dụ và việc nên làm để dễ hiểu và hành động đúng.

**Acceptance criteria**

- [x] Nội dung nền có căn cứ, mức xử lý, khắc phục và case study.
- [ ] API trả riêng `conclusion`, `explanation`, `citations`, `examples`,
  `recommendedActions` và `warnings`.
- [ ] Mọi câu trả lời đủ điều kiện đều có ít nhất một citation và một example.
- [ ] Frontend render từng phần với nhãn rõ ràng.
- [ ] Có contract test cho response.

**Evidence hiện có:** `lib/legal-content.ts`, `app/api/chat/route.ts`,
`app/page.tsx`

### [ ] US-005 — Xem đầy đủ case study được xuất bản

- **Priority:** P1
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn đọc đầy đủ các tình huống cảnh báo đã được
  xuất bản, không chỉ thấy tiêu đề.

**Acceptance criteria**

- [x] Public API chỉ trả showcase `published`.
- [x] Trang public tải showcase quản trị.
- [ ] Render danh sách theo dữ liệu thay vì cố định hai vị trí đầu.
- [ ] Hiển thị summary, topic và URL nguồn.
- [ ] Có trang/modal chi tiết và trạng thái rỗng.

**Evidence hiện có:** `app/api/content/route.ts`, `app/page.tsx`

## Epic B — Hỏi đáp có kiểm soát

### [ ] US-006 — Hỏi chatbot trong phạm vi kiến thức hiện có

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn đặt câu hỏi bằng tiếng Việt và nhận câu trả
  lời từ kho nội dung trước khi hệ thống dùng AI.

**Acceptance criteria**

- [x] Có giao diện nhập, gửi và hiển thị hội thoại.
- [x] Backend giới hạn 8 message gần nhất và 600 ký tự/message.
- [x] Backend ưu tiên nội dung quản trị `published`, sau đó nội dung nền.
- [ ] Có test đã chạy pass cho bốn nhóm câu hỏi kiến thức nền hiện tại.

**Evidence hiện có:** `app/page.tsx`, `app/api/chat/route.ts`,
`lib/legal-chat.ts`; `tests/rendered-html.test.mjs` có test definitions nhưng
chưa có bằng chứng full suite đã chạy và chưa đủ bốn nhóm.

### [ ] US-007 — Fail closed khi không đủ kiến thức

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn hệ thống nói rõ khi chưa đủ dữ liệu thay vì
  đưa ra câu trả lời pháp lý không chắc chắn.

**Acceptance criteria**

- [x] Không có dữ liệu và không có AI thì trả mode `unavailable`.
- [x] Lỗi xử lý/provider cũng rơi về câu trả lời an toàn.
- [x] Câu hỏi rỗng hoặc message sai định dạng bị từ chối.
- [ ] Có regression test đã chạy pass cho nhánh ngoài phạm vi và input không
  hợp lệ.

**Evidence hiện có:** `app/api/chat/route.ts`; regression definitions ở
`tests/rendered-html.test.mjs` chưa có bằng chứng full suite đã chạy.

### [ ] US-008 — Không cho AI tạo căn cứ ngoài dữ liệu

- **Priority:** P0
- **Persona:** Người duyệt nội dung nội bộ
- **Mô tả:** Là người duyệt, tôi muốn mọi citation và mức xử lý trong output AI
  được kiểm tra với dữ liệu truy xuất để tránh thông tin bịa đặt.

**Acceptance criteria**

- [x] Prompt yêu cầu chỉ nêu số tiền/điều khoản khi chắc chắn.
- [x] Câu hỏi không truy xuất được evidence đã duyệt luôn trả `unavailable`,
  không được chuyển sang AI kiến thức mở.
- [ ] AI chỉ nhận các record đã truy xuất cho câu hỏi hiện tại.
- [ ] Citation và số tiền được backend dựng/kiểm tra từ record, không tin output
  model.
- [ ] Output không khớp dữ liệu bị loại bỏ hoặc trả `unavailable`.
- [ ] Có test cho hallucinated citation và amount.

**Decision (2026-07-29):** DEC-002 chốt AI chỉ diễn giải evidence đã truy xuất;
ngoài kho đã duyệt phải `unavailable`.

**Evidence hiện có:** `app/api/chat/route.ts` đã gỡ các provider call và trả
`unavailable` ngay khi managed/curated retrieval không match. Regression
definition kiểm tra credential không tạo outbound call nằm ở
`tests/rendered-html.test.mjs`, nhưng chưa có bằng chứng suite đã chạy.
Evidence-bound AI composition, structured validation và citation guard vẫn chưa
được triển khai.

### [ ] US-009 — Phân biệt câu hỏi ảnh riêng tư và bản quyền

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn câu hỏi về phát tán ảnh riêng tư nhận hướng
  dẫn an toàn phù hợp, không bị hiểu nhầm thành câu hỏi bản quyền.

**Acceptance criteria**

- [x] Kho nội dung nền có một mục riêng về phát tán hình ảnh riêng tư.
- [x] Prompt có hướng dẫn an toàn cho ảnh nhạy cảm.
- [ ] Intent/ranking phân biệt quyền riêng tư với quyền tác giả.
- [x] Keyword chung `hình ảnh` không tự động chọn câu trả lời bản quyền.
- [ ] Có regression test cho cả hai intent.

**Evidence hiện có:** `lib/legal-content.ts` giữ mục riêng tư; branch
copyright/`hình ảnh` đã được gỡ khỏi `findCuratedAnswer` trong
`lib/legal-chat.ts`. Chưa có intent/ranking riêng hoặc test đủ cả privacy và
copyright.

## Epic C — Quản trị nội dung

### [ ] US-010 — Đăng nhập và bảo vệ khu vực quản trị

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị viên, tôi muốn khu vực biên tập chỉ truy cập được bằng
  phiên đăng nhập hợp lệ.

**Acceptance criteria**

- [x] Người chưa đăng nhập bị chuyển đến trang login.
- [x] Credential hợp lệ tạo session ký HMAC, hết hạn sau 8 giờ.
- [x] Cookie có `HttpOnly`, `SameSite=Strict` và `Secure` trên HTTPS.
- [x] Mutation kiểm tra origin cùng site.
- [ ] Có test đã chạy pass cho login sai, login đúng và truy cập admin.

**Evidence hiện có:** `lib/admin-auth.ts`, `app/admin/page.tsx`,
`app/admin/api/login/route.ts`, `app/admin/api/logout/route.ts`,
`tests/rendered-html.test.mjs`; test definitions chưa có bằng chứng full suite
đã chạy.

### [x] US-011 — CRUD điều luật và tình huống

- **Priority:** P0
- **Persona:** Biên tập viên
- **Mô tả:** Là biên tập viên, tôi muốn tạo, đọc, sửa và xóa nội dung pháp luật
  và case study trong CMS.

**Acceptance criteria**

- [x] Dashboard có form/list cho hai loại entity.
- [x] API hỗ trợ GET, POST, PATCH và DELETE.
- [x] Backend kiểm tra trường bắt buộc, topic, status, độ dài và URL HTTPS.
- [x] Schema D1 lưu dữ liệu và timestamp.

**Evidence:** `app/admin/AdminDashboard.tsx`,
`app/admin/api/content/route.ts`, `db/schema.ts`, `db/index.ts`,
`drizzle/0000_groovy_cerise.sql`

### [x] US-012 — Chỉ công khai nội dung đã xuất bản

- **Priority:** P0
- **Persona:** Biên tập viên
- **Mô tả:** Là biên tập viên, tôi muốn bản nháp không xuất hiện trên public
  page hoặc trong câu trả lời quản trị.

**Acceptance criteria**

- [x] Entity có trạng thái `draft/published`, mặc định `draft`.
- [x] Public content API chỉ query record `published`.
- [x] Managed chat answer chỉ query legal entry `published`.
- [x] UI quản trị cho phép thay đổi trạng thái.

**Evidence:** `db/schema.ts`, `app/api/content/route.ts`,
`lib/legal-chat.ts`, `app/admin/AdminDashboard.tsx`

### [ ] US-013 — Quy trình gửi duyệt và xuất bản

- **Priority:** P0
- **Persona:** Biên tập viên, người duyệt nội dung nội bộ
- **Mô tả:** Là đội nội dung, chúng tôi muốn workflow bốn trạng thái và quyền
  riêng để không tự xuất bản nội dung chưa kiểm chứng.

**Acceptance criteria**

- [x] Prototype có `draft/published`.
- [ ] Có `pending_review` và `archived`.
- [ ] Có vai trò `editor`, `reviewer`, `admin` được kiểm tra ở backend.
- [x] Backend bắt buộc `editor != reviewer` và chặn người tạo tự duyệt/xuất bản
  source/provision bằng creator bất biến và schema constraints.
- [ ] Reviewer nội bộ kiểm tra source allowlist, mapping điều/khoản, hiệu lực và
  diễn giải; không yêu cầu external legal reviewer.
- [ ] Reviewer có thể duyệt, từ chối và ghi lý do.
- [ ] Nội dung lưu `created_by`, `reviewed_by`, `reviewed_at`.
- [ ] Có test quyền và state transition.

**Decision (2026-07-29):** DEC-003 chốt quy trình bốn mắt
`editor != reviewer` là bắt buộc. Reviewer là người duyệt nội dung nội bộ, không
nhất thiết là luật sư.

**Evidence hiện có:** `db/schema.ts`,
`drizzle/0001_citation_foundation.sql` và `db/index.ts` áp dụng
`verified_by != created_by`, `reviewed_by != created_by` cùng trigger không cho
đổi `created_by`. `tests/schema-foundation.test.mjs` đã chạy pass các case
four-eyes và immutable creator. Runtime CMS vẫn chưa có role/reviewer API,
attribution hoặc state-transition workflow nên story còn `Partial`.

### [ ] US-014 — Xem lịch sử và phiên bản nội dung

- **Priority:** P1
- **Persona:** Người duyệt nội dung nội bộ
- **Mô tả:** Là người duyệt, tôi muốn biết ai thay đổi nội dung nào và có thể so
  sánh phiên bản để kiểm tra trách nhiệm biên tập.

**Acceptance criteria**

- [ ] Có version table hoặc immutable revision log.
- [ ] Mỗi thay đổi lưu actor, timestamp, before/after và lý do.
- [ ] CMS hiển thị lịch sử theo record.
- [ ] Nội dung đã xuất bản được archive thay vì mất dấu bằng hard delete.

**Evidence:** Chưa có.

## Epic D — Mô hình dữ liệu và nguồn pháp luật

### [ ] US-015 — Quản lý nguồn và điều khoản có cấu trúc

- **Priority:** P0
- **Persona:** Người duyệt nội dung nội bộ
- **Mô tả:** Là người duyệt, tôi muốn nguồn, điều, khoản và điểm là các record
  có cấu trúc để citation có thể kiểm chứng và tái sử dụng.

**Acceptance criteria**

- [x] Có bảng `legal_sources`.
- [x] Có bảng `legal_provisions` liên kết source.
- [x] Source publish validation chỉ chấp nhận `vbpl.vn`, `vbpl.moj.gov.vn`,
  `chinhphu.vn` và subdomain chính thức; URL ngoài allowlist bị từ chối.
- [x] `official_url` phải dùng HTTPS và authority phải khớp chính xác
  `official_host`; host giả mạo bằng path/query/fragment bị từ chối.
- [x] Có quan hệ giữa legal entry và một hoặc nhiều provision.
- [x] Có migration và seed/backfill plan cho dữ liệu hard-code hiện tại; Sprint
  1B không seed hoặc mapping nội dung.
- [ ] Có bảng `legal_sanctions` liên kết provision, lưu measure/amount/currency,
  chủ thể/độ tuổi/điều kiện áp dụng và creator/reviewer có cấu trúc.
- [ ] Sanction publish enforce `created_by` bất biến,
  `reviewed_by != created_by`, amount range/currency và provision hợp lệ; có
  migration/constraint tests.
- [ ] API không nhận citation tự do không ánh xạ được.

**Evidence:** `db/schema.ts`, `db/index.ts` và
`drizzle/0001_citation_foundation.sql` định nghĩa ba bảng cùng foreign
key/index/constraint/trigger. `docs/MIGRATION_RUNBOOK.md` mô tả migration,
restore/rollback và yêu cầu backfill phải qua reviewer nội bộ.
`tests/schema-foundation.test.mjs` đã chạy 13/13 pass, 0 skip. Chưa có API
source/provision/citation; legacy API vẫn nhận `legal_basis` text tự do. Chưa có
seed/backfill hoặc mapping Nghị định 341.

**Decision (2026-07-29):** DEC-004 chốt source allowlist mặc định. Đây là yêu
cầu đã có schema/migration/test evidence trong Sprint 1B; API integration vẫn
chưa triển khai.

### [ ] US-016 — Theo dõi hiệu lực và lần kiểm chứng nguồn

- **Priority:** P0
- **Persona:** Người duyệt nội dung nội bộ
- **Mô tả:** Là người duyệt, tôi muốn biết văn bản còn hiệu lực và lần kiểm
  chứng gần nhất để không xuất bản thông tin cũ.

**Acceptance criteria**

- [x] CR-001 đã được đối chiếu với nguồn chính thức: Nghị định
  131/2013/NĐ-CP hết hiệu lực toàn bộ từ 15/02/2026.
- [x] Tạm ngừng hai mục bản quyền đang dẫn Nghị định 131 khỏi public,
  retrieval và chat context cho tới khi người duyệt nội dung nội bộ phê duyệt
  mapping mới.
- [x] Admin `POST`/`PATCH` từ chối `status=published` khi `legalBasis` match
  deny-list Nghị định 131, trước khi truy cập DB.
- [x] Source lưu ngày ban hành, hiệu lực, hết hiệu lực và trạng thái.
- [x] Source lưu `last_verified_at` và người kiểm chứng.
- [x] Provision đã publish được trả về `pending_review` và xóa review metadata
  khi source không còn hợp lệ.
- [x] Publish provision yêu cầu source `in_force`, có hiệu lực, được kiểm chứng
  bởi người khác creator.
- [ ] Provision revision lưu hiệu lực riêng, relation bị thay thế và source
  revision/checksum; không suy hiệu lực provision chỉ từ document.
- [ ] Provision `partially_in_force` không được index trực tiếp; editor tách
  active span có page/section anchor thành revision `in_force` và qua bốn mắt.
- [ ] Freshness policy được version hóa/phê duyệt theo loại nguồn; record chưa
  có policy hoặc quá hạn bị loại khỏi publish/index/retrieval.
- [ ] Hệ thống chặn publish/retrieval khi nguồn hết hiệu lực hoặc quá hạn kiểm
  chứng.
- [ ] Footer cập nhật theo dữ liệu thay vì chuỗi hard-code.
- [ ] Có runbook/tác vụ định kỳ và cảnh báo thất bại.

**Evidence hiện có:** CR-001 tại `docs/CODE_REVIEW.md`; hai mục hard-code và
source đã được gỡ khỏi `lib/legal-content.ts`; `app/api/content/route.ts` và
`lib/legal-chat.ts` dùng `hasBlockedLegalBasis` để loại managed record khỏi
public/retrieval; `legalContext` chỉ được dựng từ danh sách còn lại.
`app/admin/api/content/route.ts` áp dụng cùng matcher cho law `POST`/`PATCH` có
trạng thái `published` trước khi khởi tạo DB. [CSDL quốc gia về VBPL xác nhận
Nghị định 131 hết hiệu lực toàn
bộ](https://vbpl.vn/TW/Pages/vbpq-thuoctinh.aspx?ItemID=32506).

Schema/migration mới có metadata hiệu lực, four-eyes publish guard và trigger
invalidation; `tests/schema-foundation.test.mjs` đã chạy 13/13 pass, 0 skip.
Combined publish/retrieval criterion vẫn chưa được check vì public/chat
retrieval chưa tích hợp structured source validity. D1 production migration và
full rendered suite chưa chạy.

Chưa có mapping mới được duyệt hoặc job kiểm chứng định kỳ.
`app/page.tsx` vẫn hiển thị cố định “07/2026”; `.env.example` chỉ ghi
`CRON_SECRET` là biến chưa được runtime sử dụng. Tài liệu này không tự mapping
điều khoản thay thế.

**Decision (2026-07-29):** DEC-004 xác định nguồn chính thức bằng allowlist;
reviewer nội bộ kiểm tra mapping/hiệu lực/diễn giải. Không cần external legal
reviewer, nhưng four-eyes của DEC-003 vẫn bắt buộc.

### [ ] US-017 — Loại bỏ trùng lặp giữa dữ liệu nền và CMS

- **Priority:** P1
- **Persona:** Biên tập viên
- **Mô tả:** Là biên tập viên, tôi muốn mỗi nội dung có một định danh ổn định và
  một nguồn sự thật để người dùng không thấy bản ghi trùng.

**Acceptance criteria**

- [x] Trang public vẫn hoạt động với dữ liệu nền khi D1 lỗi.
- [ ] Có stable slug/key để deduplicate.
- [ ] Seed dữ liệu nền vào datastore hoặc có quy tắc override rõ ràng.
- [ ] Managed content không bị nối trực tiếp thành bản sao với dữ liệu hard-code.

**Evidence hiện có:** `app/page.tsx`, `lib/legal-content.ts`

## Epic E — Bảo mật, vận hành và chất lượng

### [ ] US-018 — Lưu mật khẩu quản trị an toàn

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị hệ thống, tôi muốn password được lưu dưới dạng hash có
  salt và tài liệu môi trường khớp code.

**Acceptance criteria**

- [x] Secret được đọc server-side từ environment.
- [ ] Implementation dùng `ADMIN_PASSWORD_HASH`, không dùng plaintext.
- [x] Đã loại bỏ credential `admin/admin` khỏi `.env.example`.
- [x] `.env.example` ghi đúng runtime hiện dùng plaintext và
  `ADMIN_PASSWORD_HASH` chưa được hỗ trợ.
- [ ] Có quy trình tạo/rotate credential.
- [ ] Test xác thực hash và cấu hình thiếu.

**Evidence hiện có:** `lib/admin-auth.ts` vẫn đọc `ADMIN_PASSWORD` trực tiếp;
`.env.example` để `ADMIN_PASSWORD=` rỗng, cảnh báo không dùng credential mặc
định và ghi `ADMIN_PASSWORD_HASH` là chưa được runtime sử dụng.

### [ ] US-019 — Chống lạm dụng login và chat

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị hệ thống, tôi muốn giới hạn request và chống brute force
  để bảo vệ tài khoản và ngân sách AI.

**Acceptance criteria**

- [ ] Rate limit theo IP/session cho login.
- [ ] Rate limit và quota cho chat.
- [ ] Có backoff/lockout hợp lý mà không tiết lộ credential tồn tại.
- [ ] Có telemetry và test cho ngưỡng giới hạn.

**Evidence:** Chưa có.

### [ ] US-020 — Log an toàn và quan sát được luồng trả lời

- **Priority:** P1
- **Persona:** Quản trị hệ thống, PM
- **Mô tả:** Là đội vận hành, chúng tôi muốn biết response dùng record/citation
  nào và lỗi xảy ra ở đâu mà không lưu dữ liệu cá nhân không cần thiết.

**Acceptance criteria**

- [ ] Có correlation ID.
- [ ] Log mode, latency, retrieved record IDs, citation IDs và lỗi provider.
- [ ] Có redaction/retention policy cho câu hỏi người dùng.
- [ ] Có dashboard hoặc query hướng dẫn cho các chỉ số chính.

**Evidence:** Chưa có.

### [ ] US-021 — Kiểm thử backend và workflow end-to-end

- **Priority:** P0
- **Persona:** Đội phát triển
- **Mô tả:** Là đội phát triển, chúng tôi muốn regression suite chứng minh CRUD,
  publish và citation hoạt động xuyên suốt.

**Acceptance criteria**

- [x] Có test render public, auth, curated answer, unavailable và invalid input.
- [ ] Có test CRUD trên D1 test database.
- [ ] Có test draft không public và publish xuất hiện ở page/chat.
- [ ] Có contract test response/citation.
- [ ] Có test rate limit, RBAC và workflow review.
- [ ] Test chạy trong CI và có bằng chứng trạng thái.

**Evidence hiện có:** `tests/rendered-html.test.mjs` có regression definitions
cho render, auth, fail-closed copyright, không gọi ungrounded provider và admin
từ chối publish Nghị định 131 trước DB access; `package.json` có test command.
Bundled Node syntax checks và direct matcher probe đã pass, nhưng chưa có bằng
chứng full suite đã chạy; chưa có D1 fixture/API/managed-retrieval integration
execution.

### [ ] US-022 — Thống nhất nền tảng deploy và cấu hình môi trường

- **Priority:** P0
- **Persona:** Đội phát triển, quản trị hệ thống
- **Mô tả:** Là đội triển khai, chúng tôi muốn một runtime production rõ ràng và
  bộ biến môi trường nhất quán để backend hoạt động giống nhau giữa các môi
  trường.

**Acceptance criteria**

- [x] Có cấu hình Cloudflare Worker/D1 và scripts Vinext.
- [x] Có cấu hình Vercel public.
- [x] Đã quyết định và tài liệu hóa Cloudflare Worker + D1 là production
  primary.
- [x] `.env.example` chỉ chứa biến được hỗ trợ hoặc ghi rõ biến theo platform.
- [x] Có migration runbook gồm preflight, apply gate, verify, activate,
  rollback/restore.
- [ ] Smoke test chạy trên runtime production đã chọn.

**Decision (2026-07-29):** DEC-001 chốt Cloudflare Worker + D1 là production
primary; không giả định target Vercel hiện tại có feature parity.

**Evidence hiện có:** `package.json`, `worker/index.ts`,
`.openai/hosting.json`, `vercel.json`, `.env.example`,
`drizzle/0001_citation_foundation.sql`, `docs/MIGRATION_RUNBOOK.md` và
`docs/PRODUCT_REQUIREMENTS.md`. Story vẫn `Partial` và production đang
**BLOCKED**: Sites control plane không resolve được exact `project_id`, chưa xác
minh migration apply đúng một lần/trước activation và chưa có production smoke
test.

## Epic F — RAG và nhập dữ liệu ngoài

### [ ] US-023 — Đánh giá và đăng ký nguồn dữ liệu ngoài

- **Priority:** P0
- **Persona:** PM, quản trị nội dung, người duyệt nội bộ
- **Mô tả:** Là đội sản phẩm, chúng tôi muốn biết rõ provenance, quyền sử dụng
  và contract của từng nguồn trước khi xây connector hoặc dùng dữ liệu làm căn
  cứ.

**Acceptance criteria**

- [ ] Source registry ghi owner, endpoint/export, format, auth, quota, update
  cadence, trường dữ liệu, availability, terms/license và attribution.
- [ ] Mỗi nguồn có cả `trust_class`
  (`official|discovery_only|rejected`) và `readiness`
  (`green|yellow|red|unverified`); chỉ PM + internal content reviewer khác
  người đăng ký nguồn được nâng readiness lên `green`.
- [ ] Có sample payload/file và feasibility spike mapping vào
  `legal_sources`/`legal_provisions`.
- [ ] Có quyết định go/no-go cùng rủi ro, chi phí và cơ chế xử lý thay thế/xóa.
- [ ] Secret/test credential không được commit hoặc ghi log.

**Decision (2026-07-30):** DEC-006 chốt dữ liệu ngoài không tự động trở thành
citation hoặc được publish. Đánh giá sơ bộ các nguồn Chính phủ hiện biết nằm tại
`docs/THIRD_PARTY_DATA_ASSESSMENT.md`; chưa có provider/API cụ thể đủ đầu vào để
go production.

**Evidence:** Chưa có registry, provider-specific implementation hoặc spike;
landscape assessment hiện tại chỉ là pre-story context nên story vẫn `Todo`.

### [ ] US-024 — Nhập dữ liệu vào staging/draft có kiểm soát

- **Priority:** P0
- **Persona:** Content Ops, biên tập viên, người duyệt nội bộ
- **Mô tả:** Là đội nội dung, chúng tôi muốn nhập tài liệu ngoài một cách
  idempotent, an toàn và truy vết được mà không vô tình công khai dữ liệu chưa
  duyệt.

**Acceptance criteria**

- [ ] Connector/manual import lưu provider, upstream ID/URL, `fetched_at`,
  checksum/version và raw snapshot reference.
- [ ] Raw snapshot immutable lưu R2; editor/reviewer chỉ đọc qua protected
  review API/service binding có RBAC, exact-object authorization, TTL ngắn nếu
  dùng capability URL và audit access.
- [ ] Fetcher validate HTTPS allowlist, redirect, private IP, MIME, size và
  timeout; có rate limit theo nguồn.
- [ ] URL guard từ chối userinfo/port ngoài policy/IP literal, resolve và pin
  public IP, re-check từng redirect; parser giới hạn compressed/decompressed
  bytes, page count, CPU/memory/time.
- [ ] Import idempotent/deduplicate; parser giữ original text và tạo candidate
  source/provision.
- [ ] Parser versioned giữ page/section anchor, kiểm tra completeness, xử lý
  PDF không có text/OCR và cho reviewer xem diff candidate với raw snapshot.
- [ ] AI extraction backoffice dùng output schema, chỉ tạo field draft và không
  được tự xác nhận effectivity/citation.
- [ ] Record lỗi/malicious vào quarantine, retry có giới hạn và có báo cáo.
- [ ] Mọi candidate chỉ ở `draft`/`pending_review`; không có đường auto-publish.
- [ ] Four-eyes bắt buộc trước khi candidate trở thành corpus RAG.
- [ ] Integration fixtures bao phủ duplicate, malformed input, DNS rebinding,
  malicious redirect, malware/polyglot/decompression-bomb PDF và document
  prompt injection.

**Evidence:** `.env.example` đã có placeholder/feature flags nhưng runtime chưa
có ingestion consumer; chưa có connector/raw store/quarantine/test nên story
vẫn `Todo`.

**Proposal (2026-07-30):** PROP-001 đề xuất giữ public/admin/query backend trong
Worker hiện tại; scheduled/batch ingestion triển khai ở Worker riêng với source
credential, R2 raw store và Queue/DLQ khi chạy batch production. Chờ owner duyệt.

### [ ] US-025 — Lập chỉ mục và truy xuất RAG từ kho đã duyệt

- **Priority:** P0
- **Persona:** Học sinh, người duyệt nội dung
- **Mô tả:** Là người dùng, tôi muốn hệ thống tìm đúng evidence đã duyệt trước
  khi trả lời để mọi kết luận đều truy ngược được về nguồn chính thức.

**Acceptance criteria**

- [ ] Chỉ index revision `published`, source còn hiệu lực và đạt freshness
  policy đã phê duyệt; source chưa có policy hoặc quá hạn bị loại.
- [ ] Chunk/index giữ source ID, provision ID, revision, checksum và effectivity
  metadata.
- [ ] Baseline dùng structured filter, alias và D1 FTS5; chỉ thêm vector khi
  golden set chứng minh recall cần cải thiện.
- [ ] Source/revision thay đổi hoặc hết hiệu lực kích hoạt invalidate/re-index.
- [x] Candidate foundation dùng ranking policy/clock/freshness policy được inject
  server-side, áp dụng top-k + threshold và trả candidate ID, score, reason,
  ranking-config version, freshness-policy version cùng thời điểm đánh giá.
- [ ] Sau khi schema có reviewed answer-citation relation và provision
  revision/checksum/effectivity, retriever mới được nâng candidate set thành
  validated evidence bundle.
- [x] Không match, policy/config không hợp lệ, graph không đủ điều kiện hoặc D1
  lỗi trả kết quả nội bộ `unavailable`; không fallback sang legacy text.
- [ ] PM + internal content reviewer duyệt evaluation gate; initial proposal là
  100% citation/numeric exact-match, 0 critical unsupported claim, Recall@5 ≥
  90%, top-answer precision ≥ 95%, refusal ≥ 95% và latency P95 theo PRD.
- [ ] Eval đạt gate đã duyệt và test loại draft/stale/expired record; mọi
  recalibration sau dữ liệu thật có decision record và rerun cùng golden-set
  version.

**Decision (2026-07-30):** DEC-005 chốt RAG-first không đồng nghĩa bắt buộc
vector database.

**Delivery slice 1 (2026-07-31):** chỉ xây canonical relational join và
deterministic lexical candidate ranking. Không có FTS5/index migration, không
nối `/api/chat`, không gọi AI và không thay public response. `legal_entries` và
`legal_entry_citations` hiện thiếu review attribution; `legal_provisions` thiếu
revision/checksum/effectivity, nên row D1 hiện tại bị đánh dấu
`legacy_unverified`/`unverified` và không thể trở thành RAG evidence.

**Evidence:** `lib/legal-evidence-retriever.ts` và
`tests/legal-evidence-retriever.test.mjs`; focused suite chạy 14/14 pass, gồm
fail-closed khi candidate scan bị cắt, canonical revision xung đột, policy bị
caller mutate và metadata không hợp lệ. Story
`Partial`: FTS5, alias/index, revision/checksum schema, reviewed citation
mapping, invalidation/re-index, approved production policies và golden-set eval
vẫn mở.

### [ ] US-026 — AI phân tích và gợi ý dựa trên evidence

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là người dùng, tôi muốn AI diễn giải và đưa ví dụ/gợi ý hành động
  trong đúng phạm vi evidence đã duyệt.

**Acceptance criteria**

- [x] Có adapter OpenAI Responses API tách khỏi route handler, sanitize câu hỏi
  trước provider call và từ chối bundle rỗng hoặc thiếu eligibility metadata
  `published/in_force/fresh/four-eyes` do caller cung cấp.
- [ ] Retriever/DB boundary chứng minh source-provision relationship,
  provenance, canonical IDs/spans và freshness policy trước khi tạo
  `validatedEvidenceBundle`; adapter không tự chứng minh các dữ kiện này.
- [x] Adapter runtime không bật web search/tool hoặc gửi conversation/system
  instruction từ client; request chỉ gồm instruction cố định của server, câu hỏi
  đã sanitize và evidence trong bundle.
- [x] `AI_REPHRASE_ENABLED` mặc định `false`. Adapter return trước outbound
  request khi flag tắt, API key thiếu, model ngoài allowlist hoặc bundle không
  hợp lệ; model rỗng dùng default đã pin trong code.
- [x] Responses API dùng strict structured-output schema cho internal composer
  result gồm conclusion, explanation, example drafts, action drafts và
  warnings; từng đoạn chỉ tham chiếu evidence IDs đã cấp.
- [x] Adapter không tự dựng public response, citation hoặc sanction; output chỉ
  là internal composer result để lớp server-side validator xử lý.
- [ ] Server validate ID và gắn citation/mức xử lý từ database; model không tự
  tạo dữ liệu pháp lý.
- [ ] Mỗi factual claim phải map tới evidence span/predicate được phép; số tiền,
  độ tuổi, ngày và điều/khoản phải exact-match record đã duyệt. Claim, ngoại lệ
  hoặc điều kiện không được evidence hỗ trợ phải bị loại hoặc fail closed.
- [ ] Missing key, timeout, malformed output hoặc unknown citation fail closed:
  curated response nếu đủ dữ liệu, nếu không `unavailable`.
- [ ] `OPENAI_API_KEY` server-only; model, feature flag, timeout, quota/rate
  limit và cost telemetry được tài liệu hóa.
- [ ] Có defense cho prompt injection từ câu hỏi và source document.
- [ ] Có adapter tests cho success, flag-off, missing config, empty/invalid
  bundle, timeout, non-2xx, refusal, malformed structured output và unknown
  evidence ID; có validator tests cho hallucination,
  unsupported-claim/numeric-mismatch.
- [ ] `/api/chat` hoặc API v1 chỉ được gọi adapter sau khi structured retrieval
  trả validated citation bundle. Trước gate đó route hiện tại phải tiếp tục
  fail closed và test chứng minh credential/flag không gây outbound provider
  call khi không có bundle.

**Decision (2026-07-30):** API key không phải fallback kiến thức mở. Thay đổi
điều này cần một quyết định mới sửa DEC-002/DEC-006 và không được khuyến nghị.

**Delivery slice hiện tại:** chỉ xây adapter Responses API evidence-only và unit
tests, feature flag mặc định tắt. Không nối adapter vào `/api/chat`, không xây
retrieval/citation bundle và không thay public response contract trong lát cắt
này.

**Evidence:** `lib/openai-evidence.ts`, `tests/openai-evidence.test.mjs`,
`scripts/smoke-openai-evidence.mjs`, `.env.example` và
`cloudflare-env.d.ts`. PM audit chạy 13/13 test trước vòng hardening; suite cuối
cùng của Full-stack chạy 15/15 pass. Live smoke bằng fixture kỹ thuật pass với
`gpt-5.6-sol`. Story
`Partial`: chưa có retriever production, DB citation/sanction assembly,
semantic claim/span validation, rate limit/telemetry vận hành hoặc `/api/chat`
integration.
