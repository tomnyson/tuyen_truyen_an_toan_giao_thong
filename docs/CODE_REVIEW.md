# Code review — citation-first và backend production readiness

Ngày review: 2026-07-29  
Vai trò: Code reviewer  
Trạng thái: Review source tĩnh; review bổ sung US-025/US-026 có test evidence

## Review bổ sung — US-025 reviewed graph bridge (2026-07-31)

Phạm vi bốn mắt: migration 0002, Drizzle/bootstrap parity, immutable revision,
review invalidation, checksum contract và D1 retriever mapping.

Slice giữ đúng ranh giới expand-only:

- row legacy giữ `legacy_unverified`/`unknown`, không fake actor/checksum/date;
- citation verified bind exact provision revision/checksum;
- effectivity dùng vocabulary canonical và chỉ `in_force` eligible;
- `provision-sha256-v1` được backend recompute bằng Web Crypto trước ranking;
- provision revision đã assign là immutable; source/answer/provision change làm
  relation phụ thuộc mất review eligibility;
- output vẫn là internal candidate, không nối chat/OpenAI/FTS.

Review vòng đầu phát hiện một blocker stale-review: demote answer, sửa material
field rồi re-approve có thể giữ citation review cũ. Trigger đã đổi để mọi actual
answer material change luôn invalidate citation, kể cả answer đang
`legacy_unverified`; regression bao phủ đúng chuỗi bypass này.

Hai Medium cuối cũng đã đóng:

- checksum contract có hard-coded known-answer SHA-256, không chỉ tự so helper
  với chính helper;
- migration runbook yêu cầu 0001+0002 đúng journal order/exactly once và cấm sửa
  mọi migration đã apply.

Final four-eyes verdict: không còn blocker/High/Medium trong phạm vi slice.
Evidence: schema **17/17**, retriever **16/16**, AI regression **15/15**,
rendered/auth/chat **15/15**, TypeScript/ESLint/vinext build đều pass.

Các gate còn mở không bị hạ mức: authenticated actor/RBAC/audit transaction,
production migration-before-code, source revision/partially-in-force spans,
FTS/index jobs, validated evidence bundle và golden-set evaluation.

## Review bổ sung — US-025 ranked candidate foundation (2026-07-31)

Phạm vi bốn mắt: `lib/legal-evidence-retriever.ts`, D1 query boundary,
fail-closed eligibility/ranking và test matrix.

Review xác nhận slice được đặt đúng ranh giới: output là
`RankedProvisionCandidate`, không phải `validatedEvidenceBundle`; chưa nối
`/api/chat` hoặc OpenAI. Current D1 graph bị gắn `legacy_unverified`/`unverified`
vì schema chưa có reviewed answer-citation relation và provision
revision/checksum/effectivity.

Hai High và ba Medium từ vòng đầu đã được xử lý:

- D1 đọc thêm một row và trả `CANDIDATE_SCAN_OVERFLOW`, không rank một prefix
  theo ID rồi kết luận sai là không match;
- cùng provision/source/revision nhưng canonical fingerprint khác nhau trả
  `CANDIDATE_CONFLICT`, không silently deduplicate;
- freshness/ranking policy được clone và deep-freeze tại construction boundary;
- ranking weights bắt buộc đúng đủ exact key set;
- article/clause/point cùng answer/provision/source `updatedAt` được validate
  trước khi đưa vào candidate output.

Bằng chứng verification: retriever **14/14 pass**, OpenAI adapter regression
**15/15 pass**, schema foundation regression **13/13 pass** và TypeScript
`--noEmit`, ESLint, vinext build đều pass. Final four-eyes review xác nhận không
còn finding blocker/High/Medium trong phạm vi slice. US-025 vẫn `Partial`:
review schema/mapping, production policy, FTS/index/invalidation và golden-set
evaluation chưa hoàn tất.

## Review bổ sung — US-026 evidence composer (2026-07-30)

Phạm vi bốn mắt: `lib/openai-evidence.ts`, provider boundary và test matrix.

Các yêu cầu bắt buộc từ review đã được áp dụng:

- adapter strict opt-in và chưa nối `/api/chat`;
- evidence phải `published + in_force + freshness valid + four-eyes`;
- fixed Responses API endpoint, `store: false`, không tools/web search;
- strict schema dùng dynamic evidence-ID enum, local validation và không có
  citation/URL/sanction fields;
- model prose bị cấm chữ số; dữ liệu pháp lý định lượng phải do server dựng từ
  canonical record;
- xử lý refusal/incomplete/multiple output/timeout/HTTP/network fail closed;
- không trả/log provider body, question, evidence hoặc secret;
- contract/failure tests cuối chạy 15/15 pass và live smoke chỉ dùng fixture kỹ
  thuật.

Review vẫn để các gate sau ở trạng thái mở: D1 evidence retriever, citation và
sanction assembly, semantic claim-span validation, rate limit/circuit breaker,
production telemetry và golden-set evaluation. Vì vậy US-026 là `Partial`,
không phải `Done`, và public chat vẫn phải giữ fail-closed hiện tại.

Final review phát hiện và yêu cầu sửa trước handoff:

- bỏ `minItems: 1` khỏi explanation/example/action drafts để không ép model tạo
  nội dung khi evidence không đủ;
- thu hẹp checkbox eligibility về metadata do caller cung cấp; canonical
  provenance/relationship vẫn là gate chưa hoàn thành của retriever/DB;
- mô tả injection test đúng là request-envelope contract, không phải semantic
  resistance proof;
- parser chỉ nhận message `role=assistant` và `status=completed`.

Sau khi sửa và rerun 15/15 test, code reviewer xác nhận cả 2 High + 2 Medium đã
đóng; không còn finding blocker/high/medium trong phạm vi adapter foundation.

## 1. Phạm vi review

Review tập trung vào mục tiêu sản phẩm: người dùng hỏi thông tin pháp luật và
nhận được kết luận, dẫn chứng có thể kiểm tra, giải thích dễ hiểu và ví dụ phù
hợp. Các khu vực đã rà:

- Citation và tính toàn vẹn dữ liệu pháp luật.
- Routing/retrieval của chatbot và nhánh AI.
- CMS, trạng thái xuất bản và lịch sử nội dung.
- Authentication, session và bề mặt abuse.
- D1 schema, migration, biến môi trường và cấu hình deploy.
- Trang công khai và contract giữa UI với API.
- Test hiện có và khoảng trống kiểm thử.

Quy ước ưu tiên:

- **P0**: chặn public production; có thể phát thông tin pháp luật sai hoặc phá vỡ
  nguyên tắc citation-first.
- **P1**: cần xử lý trước production; rủi ro correctness, security hoặc vận hành
  cao.
- **P2**: nên xử lý trong các sprint gần; rủi ro vừa hoặc làm khó điều tra sự cố.
- **P3**: chất lượng/UX/maintainability, không chặn MVP nội bộ.

## 2. Kết luận review

**Chưa nên coi backend hiện tại là production-ready.** Khung full-stack đã có,
nhưng citation chưa phải một thực thể dữ liệu được kiểm soát. Có ba production
blocker:

1. Hai mục bản quyền vẫn dùng Nghị định 131/2013/NĐ-CP dù văn bản này đã hết
   hiệu lực toàn bộ từ 15/02/2026.
2. Nhánh AI được trả thẳng ra UI dưới dạng text, không có allow-list citation,
   output schema hoặc bước kiểm chứng.
3. Một tài khoản admin có thể nhập căn cứ text tự do và chuyển thẳng sang
   `published`; hệ thống sau đó gọi đây là nội dung đã kiểm duyệt và ưu tiên nó
   trước dữ liệu nền.

Sprint 0 đã tạo được nền tảng documentation-driven và đã sửa phần mô tả biến môi
trường theo đúng runtime hiện tại. Sau vòng tích hợp, API contract đã có một
shape canonical, tracker đã được reconcile và D1 được ghi là proposed default
phía sau repository boundary. Các quyết định về owner kiểm duyệt, policy AI và
platform production vẫn cần chủ dự án xác nhận trước khi implementation Sprint 1
bắt đầu.

## 3. Review of Sprint 0 documentation

### Điểm đã nhất quán

- `AGENTS.md:3-33` thiết lập đúng nguyên tắc traceability, evidence-based
  checkbox và citation không do AI tự tạo.
- `docs/PRODUCT_REQUIREMENTS.md:7-154`,
  `docs/USER_STORIES.md:1-390` và `docs/TECHNICAL_SPEC.md:43-150` mô tả khá sát
  kiến trúc as-is và không đánh đồng prototype với backend production.
- `.env.example:1-30` và `README.md:15-18` hiện đã khớp runtime:
  `ADMIN_PASSWORD` vẫn là plaintext secret, `ADMIN_PASSWORD_HASH` chưa được hỗ
  trợ, password mẫu đã để trống và các biến chưa dùng đã được ghi rõ.
- `docs/TECHNICAL_SPEC.md:3-4` xác định Sprint 0 không thay đổi business logic,
  schema hoặc API; trạng thái source code sau Sprint 0 phù hợp giới hạn này.
- Tổng số và trạng thái story trong `docs/PROGRESS.md:18-25` khớp các row tracker
  theo cách phân loại hiện được ghi nhận.

### Inconsistency/gap cần sửa trước Sprint 1

#### DOC-001 — PRD và Technical Spec định nghĩa hai API response đích khác nhau

- **Priority:** P1.
- **Trạng thái sau tích hợp:** Resolved — PRD tham chiếu contract canonical ở
  Technical Spec và dùng cùng nested response shape.
- **Vị trí:** `docs/PRODUCT_REQUIREMENTS.md:187-215`,
  `docs/TECHNICAL_SPEC.md:303-394`, `docs/USER_STORIES.md:62-75`.
- **Bằng chứng:** PRD đặt `conclusion`, `explanation`, `examples`,
  `recommendedActions`, `citations`, `warnings` ở top-level. Technical Spec đặt
  phần answer trong object `answer`, thêm `requestId`/`confidence`, và citation
  thêm `provisionId`, `documentNumber`, `documentTitle`. User story chưa chọn
  shape canonical.
- **Impact:** Full-stack và test có thể triển khai hai contract đều “đúng tài
  liệu” nhưng không tương thích.
- **Recommendation:** Chọn Technical Spec hoặc PRD làm contract canonical, cập
  nhật tài liệu còn lại và thêm JSON Schema/TypeScript type dùng chung trước khi
  tạo endpoint v1.

#### DOC-002 — PRD và Progress vẫn mô tả `.env.example` trước khi Sprint 0 sửa

- **Priority:** P1.
- **Trạng thái sau tích hợp:** Resolved — PM đã cập nhật current-state,
  US-018/US-022 và evidence theo `.env.example` mới.
- **Vị trí:** `docs/PRODUCT_REQUIREMENTS.md:317-326`,
  `docs/PROGRESS.md:46-52`, `docs/USER_STORIES.md:309-324`,
  `docs/USER_STORIES.md:376-390`; trạng thái mới ở `.env.example:1-30`.
- **Bằng chứng:** PRD vẫn nói `.env.example` mâu thuẫn code và Neon/Blob chưa
  được phân loại. Progress US-018 vẫn nói file có “hash và plaintext default”.
  Thực tế password mặc định đã bị bỏ, biến chưa dùng đã được comment rõ và README
  đã đồng bộ. Hai acceptance criterion “loại bỏ credential mặc định” của US-018
  và “env chỉ chứa biến được hỗ trợ hoặc ghi rõ” của US-022 đã có documentation
  evidence nhưng chưa được check.
- **Impact:** Tracker báo sai phần đã hoàn thành của Sprint 0 và làm người tiếp
  theo có thể lặp lại env cleanup không cần thiết.
- **Recommendation:** PM cập nhật PRD current-state, check đúng hai criterion có
  evidence và sửa row Progress. Không nâng US-018/US-022 thành `Done`: password
  hash, platform primary và runbook vẫn chưa hoàn tất.

#### DOC-003 — US-016 được ghi `Partial` nhưng chưa có acceptance criterion nào có evidence

- **Priority:** P2.
- **Trạng thái sau tích hợp:** Resolved — US-016 có criterion và evidence xác
  minh nguồn hết hiệu lực; các criterion implementation vẫn để mở.
- **Vị trí:** `docs/USER_STORIES.md:273-289`,
  `docs/PROGRESS.md:46`, `.env.example:25-30`.
- **Bằng chứng:** Cả năm criterion US-016 đều unchecked. `CRON_SECRET` chỉ là
  comment trong nhóm “Not currently used”, không phải implementation của job,
  metadata hiệu lực hay workflow.
- **Impact:** Trái với status vocabulary trong `AGENTS.md:35-41`; milestone có
  vẻ tiến triển hơn bằng chứng thực tế.
- **Recommendation:** Chuyển US-016 về `Todo`, hoặc thêm một criterion riêng cho
  source URL tĩnh nếu PM thực sự coi đó là phần có giá trị của story. Không dùng
  placeholder env làm implementation evidence.

#### DOC-004 — Kiến trúc đích giả định D1 trong khi platform primary vẫn `Blocked`

- **Priority:** P1.
- **Trạng thái sau tích hợp:** Resolved for Sprint 1 planning — Technical Spec
  ghi D1 là proposed default phía sau repository boundary; quyết định production
  của US-022 vẫn `Blocked`.
- **Vị trí:** `docs/TECHNICAL_SPEC.md:23-32`,
  `docs/TECHNICAL_SPEC.md:168-190`,
  `docs/TECHNICAL_SPEC.md:650-656`,
  `docs/PRODUCT_REQUIREMENTS.md:342-356`,
  `docs/PROGRESS.md:52`.
- **Bằng chứng:** Technical Spec ghi Cloudflare D1 là storage trong phạm vi và
  sơ đồ to-be cố định D1. PRD chỉ gọi D1 là “ứng viên chính”, còn US-022 đang
  blocked chờ chốt Cloudflare/Vercel.
- **Impact:** Schema/repository có thể được thiết kế sâu theo D1 trước khi quyết
  định platform được phê duyệt; hoặc trạng thái `Blocked` không còn đúng nếu D1
  đã thực sự được chốt.
- **Recommendation:** Chủ dự án chốt platform. Nếu chưa chốt, đánh dấu rõ kiến
  trúc D1 là proposed assumption và giữ adapter boundary; nếu chốt Cloudflare,
  cập nhật PRD/US-022/Progress và mô tả Vercel chỉ là gateway hay public-only.

#### DOC-005 — Yêu cầu password hash chưa có thiết kế kỹ thuật tương ứng

- **Priority:** P1.
- **Vị trí:** `docs/PRODUCT_REQUIREMENTS.md:256-264`,
  `docs/USER_STORIES.md:309-324`,
  `docs/TECHNICAL_SPEC.md:486-513`,
  `docs/TECHNICAL_SPEC.md:591-607`.
- **Bằng chứng:** PRD/US-018 bắt buộc salted hash, nhưng security to-be và test
  strategy trong Technical Spec chỉ nói credential mạnh/credential validation,
  chưa chốt algorithm, encoded hash format, parameter policy, migration,
  bootstrap hay rotation flow.
- **Impact:** Implementation US-018 có thể dùng một hash nhanh/không salt hoặc
  tạo format không vận hành/rotate được mà vẫn tưởng đã theo spec.
- **Recommendation:** Trước khi code US-018, đặc tả Argon2id hoặc scrypt, format
  lưu, minimum parameters, CLI/runbook tạo hash, fail-start behavior và test
  vector.

#### DOC-006 — Chưa có story/AC trực tiếp để xử lý căn cứ đã hết hiệu lực hiện tại

- **Priority:** P0.
- **Trạng thái sau tích hợp:** Resolved for tracking — US-016 và Milestone 0 đã
  có criterion P0 tạm loại nội dung hết hiệu lực, owner và evidence cần bổ sung.
- **Vị trí:** `docs/USER_STORIES.md:273-289`,
  `docs/PROGRESS.md:54-69`; finding runtime tại CR-001.
- **Bằng chứng:** US-016 mô tả cơ chế theo dõi hiệu lực tương lai nhưng không có
  acceptance criterion khẩn cấp để gỡ/thay/re-review hai mục Nghị định
  131/2013/NĐ-CP đang public. Milestone 1 cũng chỉ nói metadata và lần kiểm
  chứng.
- **Impact:** Theo `AGENTS.md`, implementation phải trace về story; blocker pháp
  lý CR-001 hiện không có work item đủ cụ thể để được check và đóng.
- **Recommendation:** Thêm criterion ổn định vào US-016 hoặc story P0 mới:
  unpublish nội dung hết hiệu lực, mapping sang nguồn hiện hành bởi reviewer,
  test không retrieval nguồn expired và evidence ký duyệt pháp lý.

#### DOC-007 — README vẫn có hai mô tả dễ gây hiểu nhầm

- **Priority:** P2.
- **Trạng thái sau tích hợp:** Resolved — README phân biệt `published` với review
  chuyên môn và ghi rõ Vercel chưa có storage adapter cho CMS/D1.
- **Vị trí:** `README.md:38-48`; đối chiếu
  `docs/TECHNICAL_SPEC.md:83-94`, `docs/PROGRESS.md:52`.
- **Bằng chứng:** README gọi chat là “ưu tiên dữ liệu đã kiểm duyệt” dù runtime
  chỉ kiểm tra `status=published`, chưa có reviewer. README liệt kê Vercel là bản
  public nhưng không nói CMS/D1 backend không có storage adapter trên target đó.
- **Impact:** Contributor/operator có thể hiểu `published = reviewed` hoặc coi
  hai target deploy có capability tương đương.
- **Recommendation:** Dùng từ “nội dung CMS đã published” cho as-is; thêm cảnh
  báo Vercel public-only/degraded nếu đó là chủ đích, hoặc bỏ mô tả target này
  cho tới khi US-022 được quyết định.

### Kết luận Sprint 0

Documentation foundation **đạt để tiếp tục làm rõ**, nhưng **chưa đạt gate để
bắt đầu implementation API/schema citation-first**. Tối thiểu cần đóng DOC-001,
DOC-002, DOC-004 và tạo tracking item cho DOC-006. Các thay đổi `.env.example`
và README là documentation evidence; chúng không sửa CR-008 trong runtime.

## 4. Current defects

### P0

#### CR-001 — Nội dung bản quyền đang dẫn văn bản đã hết hiệu lực

- **Trạng thái Sprint 1A:** Mitigated, chưa đóng — hai mục hard-code và source
  đã bị loại; public API và managed retrieval có deny-list tạm thời. Chỉ đóng
  finding sau khi có source/provision có cấu trúc, D1 regression test và mapping
  mới được người duyệt nội dung nội bộ phê duyệt.
- **Vị trí hiện tại:** deny-list và dữ liệu active tại
  `lib/legal-content.ts`, public/read guards tại `app/api/content/route.ts`,
  `lib/legal-chat.ts`, và publish guard tại `app/admin/api/content/route.ts`.
- **Bằng chứng:** Hai mục “Sao chép tác phẩm trái phép, đạo văn” và “Cố ý vô
  hiệu biện pháp bảo vệ phần mềm” vẫn dẫn Nghị định 131/2013/NĐ-CP; toàn bộ
  danh sách này còn được đưa vào system prompt của AI. CSDL quốc gia về VBPL
  ghi nhận [Nghị định 131/2013/NĐ-CP hết hiệu lực toàn bộ từ
  15/02/2026](https://vbpl.vn/TW/Pages/vbpq-thuoctinh.aspx?ItemID=32506).
  Nghị định 341/2025/NĐ-CP có hiệu lực từ cùng ngày và bãi bỏ Nghị định 131,
  nhưng mapping điều/khoản/mức phạt mới chưa được kiểm chứng trong project:
  [văn bản thay thế trên CSDL quốc gia về
  VBPL](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=185823).
- **Impact:** Trang tra cứu và chatbot có thể cung cấp căn cứ, điều khoản và mức
  tiền đã lỗi thời vào ngày review. Đây là lỗi pháp lý trực tiếp, không chỉ là
  thiếu tính năng.
- **Recommendation:** Tạm ngừng xuất bản hai mục này và loại chúng khỏi
  `legalContext` cho đến khi người duyệt pháp lý mapping lại sang văn bản đang
  hiệu lực. Thêm `effective_from`, `effective_to`, `verification_status` và
  `last_verified_at`; chặn publish và retrieval khi nguồn hết hiệu lực hoặc quá
  hạn kiểm tra.

#### CR-002 — AI output không bị ràng buộc bởi citation đã duyệt

- **Trạng thái Sprint 1A:** Mitigated, chưa đóng — provider fallback không còn
  được gọi khi retrieval không trả evidence. Grounded AI composer, output
  validation và citation allow-list vẫn chưa được triển khai.
- **Vị trí hiện tại:** fail-closed orchestration tại
  `app/api/chat/route.ts`; grounded AI contract đích tại
  `docs/TECHNICAL_SPEC.md`.
- **Bằng chứng:** Khi không match knowledge, API gửi hội thoại tới model rồi trả
  nguyên chuỗi model sinh ra bằng `{ answer, mode: "ai" }`. Prompt chỉ yêu cầu
  model “chỉ nêu ... khi chắc chắn”; server không parse citation, không kiểm tra
  citation thuộc dữ liệu đã duyệt, không kiểm tra hiệu lực và UI cũng không phân
  biệt nguồn chứng cứ.
- **Impact:** Model có thể bịa, sửa hoặc ghép sai điều/khoản/mức phạt. Một lời
  nhắc trong prompt không tạo ra security/correctness boundary cho dữ liệu pháp
  luật.
- **Recommendation:** Trước mắt fail-closed cho câu ngoài kho đã duyệt, hoặc chỉ
  cho AI diễn giải các record đã retrieve. Response phải có schema
  `conclusion`, `explanation`, `examples`, `actions`, `citations`, `warnings`;
  server tự gắn citation từ ID trong DB và từ chối mọi citation không nằm trong
  tập đã retrieve. Không lấy citation từ text model sinh.

#### CR-003 — `published` không chứng minh nội dung đã được kiểm duyệt

- **Vị trí:** `db/schema.ts:4-16`,
  `app/admin/api/content/route.ts:7-39`,
  `app/admin/api/content/route.ts:73-114`,
  `app/admin/AdminDashboard.tsx:159-180`,
  `lib/legal-chat.ts:64-82`.
- **Bằng chứng:** `legalBasis`, `penalty` và toàn bộ nội dung pháp luật là text tự
  do. Người giữ một credential admin có thể chọn `published` ngay khi tạo/sửa.
  Không có reviewer, thời điểm review, source URL, hiệu lực, version hay audit
  trail. `findManagedAnswer` sau đó ưu tiên record này trước curated answer.
- **Impact:** Nội dung chưa được thẩm định có thể lập tức trở thành câu trả lời
  “knowledge” công khai. Không thể truy nguyên ai duyệt căn cứ nào hoặc rollback
  chính xác một lần publish.
- **Recommendation:** Chặn direct `draft -> published`; triển khai
  `draft -> pending_review -> published -> archived`, tách quyền editor/reviewer,
  và yêu cầu citation record hợp lệ trước publish. Lưu actor, review timestamp,
  content version và audit event. Tới khi có workflow này, không mô tả managed
  content là “đã kiểm duyệt”.

### P1

#### CR-004 — Data model không thể biểu diễn citation có thể kiểm tra

- **Vị trí:** `db/schema.ts:4-27`,
  `drizzle/0000_groovy_cerise.sql:1-24`,
  `app/api/content/route.ts:8-12`, `app/page.tsx:242-260`.
- **Bằng chứng:** `legal_basis` là một chuỗi; không có document ID, điều/khoản/
  điểm, URL chính thức, ngày hiệu lực, ngày hết hiệu lực hay ngày kiểm chứng.
  Danh sách `sources` tách rời các answer và còn thiếu Nghị định 15/2020/NĐ-CP
  dù hai answer đang dẫn văn bản này (`lib/legal-content.ts:55-73`,
  `lib/legal-content.ts:101-114`).
- **Impact:** UI không thể tạo link chính xác theo từng câu trả lời; backend
  không thể kiểm tra nguồn còn hiệu lực hoặc ngăn citation bị sửa âm thầm.
- **Recommendation:** Tách `legal_sources`, `legal_provisions`,
  `legal_answers`, `legal_answer_citations`, `legal_examples`. Public API chỉ
  phát citation đã join qua khóa ngoại và đã qua review.

#### CR-005 — Managed retrieval có thể chọn sai answer và ưu tiên kết quả sai

- **Vị trí:** `lib/legal-chat.ts:57-82`,
  `app/api/chat/route.ts:117-120`.
- **Bằng chứng:** Retrieval lấy tối đa 100 record mới nhất, đếm substring trên
  title/topic/tags/legal basis, cho phép truy vấn một từ match với score 1 và
  dùng `updatedAt` để phân thắng khi đồng điểm. Không có exact intent, boundary
  token, độ tin cậy, citation validity hoặc tie rejection.
- **Impact:** Câu hỏi ngắn/chung có thể nhận một record mới cập nhật nhưng không
  đúng ý định. Do managed answer đứng trước curated answer, một match yếu có thể
  che câu trả lời nền đúng hơn.
- **Recommendation:** Chuẩn hóa tag/alias theo dữ liệu, dùng token/phrase match
  có trọng số, minimum confidence và ambiguity rejection. Chỉ chọn record có
  citation hợp lệ; khi top candidates sát điểm nhau thì hỏi lại hoặc trả
  `unavailable`. Viết test bằng một D1 fixture có nhiều record cạnh tranh.

#### CR-006 — Keyword “hình ảnh” định tuyến sai tình huống quyền riêng tư

- **Vị trí:** `lib/legal-chat.ts:40-45`; dữ liệu quyền riêng tư tương ứng ở
  `lib/legal-content.ts:64-73`.
- **Bằng chứng:** Mọi câu có chuỗi `hinh anh` bị trả về nhánh bản quyền, trước khi
  có bất kỳ logic nào nhận diện “ảnh riêng tư”, “phát tán”, “nhạy cảm” hoặc “bạn
  học”.
- **Impact:** Một học sinh hỏi về phát tán ảnh riêng tư có thể nhận hướng dẫn
  giấy phép bản quyền thay vì hướng dẫn an toàn và căn cứ đúng chủ đề.
- **Recommendation:** Tách intent privacy/safety khỏi copyright; ưu tiên dấu
  hiệu nguy cơ, thêm test cho ảnh riêng tư/ảnh nhạy cảm/ảnh dùng trong bài học.

#### CR-007 — Một số answer gắn mode `knowledge` nhưng không có căn cứ

- **Vị trí:** `lib/legal-chat.ts:47-52`,
  `app/api/chat/route.ts:117-120`.
- **Bằng chứng:** Câu trả lời “15 tuổi/16 tuổi/50cc” không nêu bất kỳ văn bản,
  điều/khoản hoặc nguồn nào, nhưng API vẫn trả mode `knowledge`.
- **Impact:** Contract hiện tại khiến frontend/người dùng không phân biệt được
  “kiến thức đã có citation” với lời khuyên thận trọng không dẫn chứng.
- **Recommendation:** Chỉ dùng mode `knowledge` khi response có ít nhất một
  citation hợp lệ. Nếu chưa có căn cứ đã duyệt, dùng `insufficient_evidence`
  và không khẳng định kết luận pháp lý.

#### CR-008 — Runtime vẫn yêu cầu mật khẩu quản trị plaintext

- **Vị trí:** `lib/admin-auth.ts:43-53`, `.env.example:1-8`,
  `README.md:15-18`, `tests/rendered-html.test.mjs:5-8`.
- **Bằng chứng:** Sprint 0 đã sửa tài liệu cấu hình: password mặc định bị bỏ,
  `.env.example` và README nói chính xác rằng runtime đọc `ADMIN_PASSWORD` từ
  secret manager và chưa hỗ trợ hash. Tuy vậy implementation vẫn tải password
  nguyên văn rồi so sánh trực tiếp; `ADMIN_PASSWORD_HASH` không được runtime
  dùng. `admin/admin` trong test là fixture cục bộ, không còn là giá trị deploy
  được đề xuất.
- **Impact:** Documentation drift/default-credential risk đã giảm, nhưng secret
  store/config dump vẫn làm lộ ngay password có thể đăng nhập. NFR-02 và US-018
  về salted password hash vẫn chưa đạt.
- **Recommendation:** Giữ finding là **current defect P1** cho production
  readiness. Triển khai `ADMIN_PASSWORD_HASH` bằng Argon2id/scrypt theo spec đã
  chốt, loại plaintext khỏi production runtime, thêm CLI/runbook tạo/rotate hash
  và test cấu hình thiếu/không hợp lệ. Documentation cleanup Sprint 0 chỉ là
  evidence một phần của US-018, không phải bản sửa security.

#### CR-009 — Không có rate limit cho login và chat

- **Vị trí:** `app/admin/api/login/route.ts:8-28`,
  `app/api/chat/route.ts:102-139`.
- **Bằng chứng:** Hai endpoint public xử lý mọi request ngay, không có quota theo
  IP/session, exponential backoff, lockout tạm thời hay giới hạn ngân sách model.
- **Impact:** Login có thể bị brute-force; chat có thể bị abuse để tiêu tốn chi
  phí AI và tài nguyên outbound.
- **Recommendation:** Thêm rate limit ở edge và application, retry-after, quota
  riêng cho anonymous chat, giới hạn concurrency/cost, metric và alert. Không
  log nội dung riêng tư không cần thiết.

#### CR-010 — Cấu hình Vercel hứa một backend không có D1 binding

- **Vị trí:** `vercel.json:1-4`, `db/index.ts:1-2`,
  `db/index.ts:37-44`, `.openai/hosting.json:1-4`,
  `vite.config.ts:14-56`, `README.md:43-44`.
- **Bằng chứng:** Data layer import `cloudflare:workers` và bắt buộc `env.DB`.
  Cloudflare/Sites có binding `DB`, nhưng Vercel chỉ chạy `next build` và không
  có storage adapter tương đương. Public content che lỗi thành mảng rỗng, còn
  admin CRUD sẽ lỗi.
- **Impact:** Có thể deploy thành công một bản trông hoạt động nhờ static fallback
  nhưng mất toàn bộ backend/CMS; operator khó nhận biết môi trường production
  đang chạy chế độ suy giảm.
- **Recommendation:** Chốt Cloudflare là target production và bỏ/đánh dấu rõ
  Vercel public-only, hoặc xây storage adapter thật cho Vercel. Thêm startup/
  health check xác nhận D1 binding và migration trước khi nhận traffic.

### P2

#### CR-011 — Client được quyền cung cấp cả lịch sử `assistant` cho model

- **Vị trí:** `app/api/chat/route.ts:12-27`,
  `app/api/chat/route.ts:43-46`, `app/api/chat/route.ts:71-74`.
- **Bằng chứng:** API chấp nhận `role: "assistant"` trực tiếp từ request và
  forward tối đa tám message tới provider. Server không sở hữu hoặc ký lịch sử
  hội thoại.
- **Impact:** Caller có thể giả mạo các câu trả lời trước để tăng hiệu quả prompt
  injection và làm model tiếp tục một tiền đề/citation không tồn tại.
- **Recommendation:** Với MVP, chỉ nhận câu hỏi hiện tại. Nếu cần multi-turn,
  lưu history server-side theo session hoặc đánh dấu toàn bộ lịch sử client là
  untrusted context; không dùng nó làm evidence.

#### CR-012 — Public API che mọi lỗi D1 thành `200` với dữ liệu rỗng

- **Vị trí:** `app/api/content/route.ts:5-15`,
  `app/page.tsx:64-83`.
- **Bằng chứng:** Mọi exception được chuyển thành `{ laws: [], showcases: [] }`
  với HTTP 200, không error code/metric. UI tiếp tục bằng static fallback.
- **Impact:** Mất binding, lỗi migration hoặc outage có thể kéo dài mà health
  check vẫn xanh; nội dung vừa publish “biến mất” không có tín hiệu vận hành.
- **Recommendation:** Log lỗi có request ID, trả `503` và machine-readable error;
  UI vẫn có thể fallback nhưng phải hiển thị trạng thái dữ liệu và monitoring
  phải nhận biết degraded mode.

#### CR-013 — Runtime tự tạo schema nhưng không bảo đảm migration/version

- **Vị trí:** `db/index.ts:5-33`, `db/index.ts:51-62`,
  `build/sites-vite-plugin.ts:17-42`.
- **Bằng chứng:** Mỗi isolate gọi `CREATE TABLE IF NOT EXISTS` cho schema ban đầu.
  Cơ chế này không thêm/sửa column khi schema tiến hóa và không kiểm tra Drizzle
  journal đã apply, dù migrations được đóng gói vào artifact.
- **Impact:** Deploy schema mới có thể chạy với database cũ và chỉ lỗi tại runtime;
  application schema, bootstrap SQL và migration dễ drift thành ba nguồn sự thật.
- **Recommendation:** Apply migration bằng release step có version table và
  rollback/backup plan. Runtime chỉ kiểm tra version/health, không âm thầm thay
  migration system.

#### CR-014 — Xóa nội dung là hard delete, không có audit hoặc recovery

- **Vị trí:** `app/admin/api/content/route.ts:119-130`,
  `app/admin/AdminDashboard.tsx:103-117`.
- **Bằng chứng:** DELETE xóa row ngay và vẫn trả `{ ok: true }` kể cả ID không tồn
  tại. Không có archive, deleted actor, snapshot hay event log.
- **Impact:** Mất nội dung/citation khó phục hồi; không thể điều tra vì sao một
  căn cứ biến mất hoặc chứng minh nội dung đã hiển thị tại một thời điểm.
- **Recommendation:** Dùng `archived`/soft delete, audit event bất biến và backup.
  Trả 404 khi target không tồn tại; hard delete chỉ dành cho quy trình retention
  có quyền cao hơn.

#### CR-015 — Giới hạn độ dài và quy tắc output chỉ nằm trong prompt

- **Vị trí:** `lib/legal-chat.ts:8-15`,
  `app/api/chat/route.ts:43-47`, `app/api/chat/route.ts:71-76`.
- **Bằng chứng:** Yêu cầu tối đa 180 từ và format an toàn không được validate sau
  khi provider trả kết quả. `max_*_tokens: 500` không tương đương 180 từ và không
  đảm bảo các mục bắt buộc.
- **Impact:** UI có thể nhận câu quá dài, thiếu cảnh báo hoặc không đúng cấu trúc;
  behavior thay đổi theo model/provider.
- **Recommendation:** Validate structured output tại server, áp schema và
  deterministic post-check; fail-closed nếu thiếu trường/citation bắt buộc.

#### CR-016 — Test suite không đi qua backend D1/CMS quan trọng nhất

- **Vị trí:** `tests/rendered-html.test.mjs:5-12`,
  `tests/rendered-html.test.mjs:114-167`, `package.json:12-14`.
- **Bằng chứng:** `workerEnv` không có `DB`, nên `findManagedAnswer` luôn rơi vào
  catch và các test chỉ đi qua hard-coded knowledge/fail-closed. Không có test
  CRUD, draft/publish, reviewer workflow, citation join, source expiry, migration,
  AI schema, prompt injection, rate limit hoặc deploy parity.
- **Impact:** Nhánh được gọi là “backend chưa làm” có thể hỏng hoàn toàn mà suite
  vẫn xanh. Test hiện tại cũng không phát hiện Nghị định 131 đã hết hiệu lực.
- **Recommendation:** Tạo D1 test fixture, contract test API response và E2E
  `draft -> review -> publish -> retrieve -> render citation`. Thêm fixture nguồn
  hết hiệu lực và test rejection; mock provider để test citation allow-list.

### P3

#### CR-017 — Showcase CMS không được render như một case study có dẫn nguồn

- **Vị trí:** `app/page.tsx:277-297`.
- **Bằng chứng:** UI chỉ lấy title của `managedShowcases[0]` và `[1]`; bỏ qua
  `summary`, `sourceUrl`, topic thực và tất cả record tiếp theo. Card không có
  click handler tới nội dung managed.
- **Impact:** Admin tưởng đã xuất bản tình huống/nguồn nhưng người dùng chỉ thấy
  tiêu đề đặt vào hai layout hard-code.
- **Recommendation:** Render danh sách theo record, filter theo topic, mở trang/
  modal chi tiết và hiển thị source URL đã duyệt. Có empty/loading/error state.

#### CR-018 — Mốc “Cập nhật nội dung” là text hard-code

- **Vị trí:** `app/page.tsx:315-319`.
- **Bằng chứng:** Footer luôn ghi `07/2026`, không phụ thuộc lần kiểm chứng nguồn
  hoặc lần publish.
- **Impact:** Sau một thời gian, người dùng có thể hiểu nhầm toàn bộ căn cứ đã
  được rà ở mốc này.
- **Recommendation:** Hiển thị `last_verified_at` theo từng citation; footer chỉ
  hiển thị mốc tổng hợp được tính từ dữ liệu, kèm định nghĩa rõ “cập nhật”.

## 5. Future enhancements

Các mục dưới đây là nâng cấp tương lai, không được dùng để thay thế việc sửa các
current defect P0/P1:

### FE-001 — Citation provenance và snapshot

- **Liên quan:** `db/schema.ts:4-27`, `.env.example:25-30`.
- Lưu checksum/snapshot của nguồn tại thời điểm review, URL canonical và metadata
  nguồn. Snapshot chỉ là bằng chứng lịch sử; link chính thức đang hiệu lực vẫn là
  nguồn chính.

### FE-002 — Scheduled source verification

- **Liên quan:** `.env.example:25-30`.
- Dùng job định kỳ có `CRON_SECRET` để kiểm tra HTTP status, metadata hiệu lực và
  tạo review task. Không tự động thay nội dung pháp lý chỉ vì crawler phát hiện
  thay đổi.

### FE-003 — RBAC, MFA và quản lý session

- **Liên quan:** `lib/admin-auth.ts:43-76`.
- Tách editor/reviewer/admin, hỗ trợ MFA, session ID có thể revoke, rotation và
  danh sách phiên. Hiện một tài khoản dùng chung không đủ audit attribution.

### FE-004 — Retrieval có giải thích và đánh giá chất lượng

- **Liên quan:** `lib/legal-chat.ts:57-82`.
- Ghi lại candidate IDs, score, citation IDs và reason code không chứa PII; xây
  golden question set theo từng chủ đề. Chỉ cân nhắc vector/hybrid search sau khi
  lexical baseline và evaluation set ổn định.

### FE-005 — Versioned API contract

- **Liên quan:** `app/api/chat/route.ts:95-136`, `app/page.tsx:117-129`.
- Version schema response, thêm `answer_id`, `content_version`,
  `verified_at`, `retrieval_mode` và `request_id`; frontend render theo field
  thay vì một blob text.

### FE-006 — Observability và privacy retention

- **Liên quan:** `app/api/chat/route.ts:102-139`.
- Metric theo mode/latency/error/source age, redaction dữ liệu nhạy cảm, retention
  policy và quyền xóa. Không lưu nguyên câu hỏi của trẻ vị thành niên mặc định.

### FE-007 — Concurrency control và release rollback

- **Liên quan:** `app/admin/api/content/route.ts:95-114`.
- Thêm optimistic locking bằng version/updated_at, preview diff trước publish,
  rollback một version và canary cho thay đổi nguồn lớn.

## 6. Ma trận bao phủ review

| Khu vực | Finding chính | Mức cao nhất |
|---|---|---:|
| Citation/data integrity | CR-001, CR-003, CR-004 | P0 |
| Chatbot routing/AI | CR-002, CR-005, CR-006, CR-007 | P0 |
| CMS publish workflow | CR-003, CR-014 | P0 |
| Auth/security | CR-008, CR-009, CR-011 | P1 |
| Env/deployment drift | CR-010, CR-012, CR-013 | P1 |
| Tests | CR-016 | P2 |
| Public case study/UX | CR-017, CR-018 | P3 |

## 7. Chưa xác minh

- Chưa chạy `npm run lint`, `npx tsc --noEmit`, `npm test` hoặc build: môi trường
  review không có `node`, `npm` và `node_modules`.
- Chưa có D1 binding/production data để kiểm tra record đang tồn tại, migration
  đã apply, volume, latency hoặc backup.
- Chưa gọi provider AI thật; review nhánh AI dựa trên code path và contract.
- Chưa kiểm tra secret/deployment setting thực tế của Cloudflare/Vercel.
- Chỉ đối chiếu trạng thái hiệu lực của các văn bản nổi bật bằng nguồn chính
  thức. Chưa thực hiện legal review đầy đủ cho từng điều/khoản, mức tiền, đối
  tượng áp dụng, quy định chuyển tiếp hoặc các sửa đổi/hợp nhất. Trước khi public,
  toàn bộ sáu nội dung nền và mọi managed entry vẫn cần người có chuyên môn pháp
  lý duyệt.

## 8. Review gate đề xuất

### Gate trước Sprint 1 implementation

- [x] DOC-001 được đóng bằng một API schema canonical dùng chung cho PRD, spec
      và story; contract test vẫn được theo dõi riêng trong US-021.
- [x] DOC-002 được cập nhật để tracker phản ánh đúng env cleanup đã hoàn thành.
- [x] DOC-004 được quyết định hoặc ghi rõ D1 chỉ là assumption có adapter
      boundary.
- [x] DOC-006 có user story/acceptance criterion P0 và owner.
- [x] Các open decision ảnh hưởng schema/workflow được chốt: người duyệt nội
      dung nội bộ, source-domain allowlist, quy trình bốn mắt và chính sách AI khi không có
      evidence.

### Gate trước public production

- [ ] CR-001, CR-002 và CR-003 được xử lý và có test evidence.
- [ ] Mọi answer công khai có citation record, URL chính thức, trạng thái hiệu
      lực và thời điểm review.
- [ ] AI không thể phát ra citation ngoài tập server đã retrieve.
- [ ] Direct publish được thay bằng review workflow có attribution.
- [ ] Runtime không còn phụ thuộc password plaintext; credential provisioning,
      hash verification và rotation được test.
- [ ] Rate limit login/chat, abuse telemetry và privacy retention được test.
- [ ] Một môi trường staging chạy D1 migration và E2E
      `publish -> query -> citation -> example` thành công.
- [ ] Người duyệt nội dung nội bộ phê duyệt bộ dữ liệu MVP theo quy trình bốn
      mắt.
- [ ] Tất cả finding P0/P1 được đóng bằng evidence hoặc có risk acceptance bằng
      văn bản từ owner phù hợp; không được risk-accept CR-001/CR-002 cho public.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, migration test và production
      runtime smoke test đều có kết quả pass trong CI/staging.

## 9. Sprint 1A hotfix review

### Kết quả

- **PASS:** Hai mục hard-code và nguồn Nghị định 131/2013/NĐ-CP đã bị loại khỏi
  public content và `legalContext`.
- **PASS:** Managed public API và chat retrieval có deny-list tạm thời cho Nghị
  định 131, bao gồm biến thể khoảng trắng, dấu câu và dấu gạch Unicode phổ biến.
- **PASS:** Admin POST/PATCH từ chối publish căn cứ khớp deny-list trước khi
  truy cập database.
- **PASS:** Câu hỏi không có evidence trả `unavailable`; route không còn gọi
  OpenAI/Vercel Gateway dù credential tồn tại, đúng DEC-002.
- **PASS:** Wording runtime dùng “dữ liệu hiện được xuất bản”, không tuyên bố
  workflow kiểm duyệt đã tồn tại.
- **PASS:** Gợi ý UI không còn quảng bá intent chưa có answer hoạt động.
- **PASS:** `git diff --check`.

### Evidence test đã thêm

- Homepage không chứa Nghị định 131 hoặc hai title bị ảnh hưởng.
- Câu hỏi đạo văn/bản quyền trả `unavailable` và không tự map sang Nghị định 341.
- Knowledge answer còn lại không phát Nghị định 131/341.
- Khi có provider credential, unmatched question vẫn không tạo outbound provider
  call.
- Admin API có test definition cho biến thể `Nghị định số 131 / 2013 / NĐ–CP`
  và kỳ vọng `400` trước khi truy cập D1.

### Khoảng trống còn lại

- **P2:** Test hiện tại không seed D1 record `published` chứa Nghị định 131 và
  chưa gọi `/api/content`; vì vậy deny-list trên managed public API/retrieval mới
  có code evidence, chưa có integration-test evidence.
- Bundled Node syntax checks cho các route/lib/test đã pass; direct matcher probe
  với bốn biến thể blocked và hai căn cứ allowed đã pass.
- Không chạy được lint, TypeScript, build hoặc test suite trong workspace này vì
  chưa có project dependencies. Kết quả test mới là test definition, chưa phải
  execution evidence.
- Citation schema/migration của US-015 được deferred sang lượt riêng; hotfix
  không được coi là giải pháp data-integrity cuối cùng.

### Acceptance recommendation cho PM

- Có thể check criterion US-008 “không có evidence thì không gọi AI”.
- Có thể check criterion US-016 “tạm ngừng public/retrieval hai mục Nghị định
  131” bằng code evidence.
- Chưa check criterion Sprint 1A regression cho public API/managed retrieval tới
  khi có D1 integration test chạy thành công.
- CR-001 và CR-002 giữ trạng thái `Mitigated`, không phải `Closed`.

## 10. Sprint 1A pre-fix review snapshot

> Snapshot này được thực hiện trước các fix matcher, wording, UI status và
> publish guard cuối Sprint 1A. Trạng thái hiện hành nằm ở mục 9 phía trên.

Phạm vi ngày 2026-07-29: diff runtime/test Sprint 1A và Technical Spec cập nhật.

**PASS có điều kiện, không thấy blocker mới trong read path public/chat.**

- **CR-001 — Mitigated, chưa final fix:** hai mục hard-code và source Nghị định
  131 đã bị loại khỏi `laws`/`sources` (`lib/legal-content.ts:26-90`);
  `/api/content` loại managed entry có căn cứ bị chặn
  (`app/api/content/route.ts:8-16`); managed chat retrieval cũng loại entry đó
  (`lib/legal-chat.ts:61-80`). Câu hỏi bản quyền hiện fail-closed. Chưa thể đóng
  CR-001 vì chưa có source/provision model, hiệu lực có cấu trúc, mapping thay thế
  được người duyệt nội dung nội bộ phê duyệt hoặc publish-time invariant.
- **CR-002 — Mitigated cho runtime hiện tại, final feature deferred:** toàn bộ
  OpenAI/Gateway call đã được gỡ khỏi `app/api/chat/route.ts:1-64`; câu không
  match luôn trả `unavailable` dù có credential. Evidence-bound AI composition
  chưa được làm, nên không coi đây là hoàn thành AI citation-first.
- **Schema citation:** deferred đúng như
  `docs/TECHNICAL_SPEC.md:543-551`; không có schema/migration diff. US-015 phải
  giữ `Todo`, không check partial schema delivery của Sprint 1A.

### Acceptance review

| Acceptance | Kết quả | Evidence / gap |
|---|---|---|
| Hai mục NĐ 131 không còn trong static public/search/context | PASS static | `lib/legal-content.ts:26-90`, `lib/legal-chat.ts:10-25`, `app/page.tsx:181-190,277-291` |
| Managed NĐ 131 không ra public API/chat | PASS code, chưa integration-verified | `app/api/content/route.ts:8-16`, `lib/legal-chat.ts:61-80`; chưa có D1 fixture |
| Câu bản quyền chờ review trả `unavailable` | PASS code; test chưa chạy | `app/api/chat/route.ts:52-60`, `tests/rendered-html.test.mjs:147-159` |
| Không gọi ungrounded provider theo DEC-002 | PASS static; test chưa chạy | provider code đã bị xóa; test tại `tests/rendered-html.test.mjs:161-182` |
| Regression page/API/chat | PARTIAL | Có page/chat assertions; chưa test `/api/content` hoặc managed retrieval với record D1 bị chặn |
| Env/README/spec khớp runtime | PARTIAL | Env/README đúng việc provider bị tắt; wording/tracker còn lệch như findings dưới |

### Findings

#### S1A-001 — Block rule là substring text tự do và không chặn CMS publish

- **Priority:** P1.
- **Vị trí:** `lib/legal-content.ts:88-90`,
  `app/admin/api/content/route.ts:26-39,73-114`.
- **Impact:** Variant như khoảng trắng/dấu gạch khác có thể lọt filter; admin vẫn
  có thể tạo record `published` dẫn NĐ 131 và chỉ bị ẩn ở một số read path.
- **Recommendation:** Hotfix tối thiểu dùng canonical document-number parser/
  regex có test variant và chặn chuyển sang `published`. Final fix phải dùng FK
  source + effective status, không dựa trên free text.

#### S1A-002 — Chưa có regression test cho managed D1/public API

- **Priority:** P1.
- **Vị trí:** `tests/rendered-html.test.mjs:5-18,56-182`.
- **Impact:** Test env không có `DB`; `/api/content` và `findManagedAnswer` với
  record NĐ 131 chưa được thực thi. Checkbox “public page/API/chat” chưa đủ
  evidence.
- **Recommendation:** Thêm D1 fixture có một record allowed và một record blocked;
  assert `/api/content` và chat chỉ trả record allowed.

#### S1A-003 — Response gọi dữ liệu `published` là “đã được kiểm duyệt”

- **Priority:** P1.
- **Vị trí:** `app/api/chat/route.ts:9-10`; đối chiếu `README.md:35-40` và
  DEC-003.
- **Impact:** User-facing message overclaim review status dù runtime chưa có
  reviewer/RBAC và `published` chưa đồng nghĩa reviewed.
- **Recommendation:** Đổi thành “dữ liệu hiện có của cổng” hoặc “kho nội dung đã
  xuất bản” cho tới khi DEC-003 được implement.

#### S1A-004 — UI báo AI đang hoạt động trong khi provider đã bị tắt

- **Priority:** P2.
- **Vị trí:** `app/page.tsx:336-340`; đối chiếu `.env.example:14-21`.
- **Impact:** Trạng thái UI mâu thuẫn runtime/DEC-002 và tạo kỳ vọng sai.
- **Recommendation:** Hiển thị “Trợ lý tra cứu” hoặc trạng thái không nhắc AI
  provider cho tới khi evidence-bound composition hoạt động.

#### S1A-005 — Tracker/PRD/spec chưa đồng bộ hoàn toàn với diff và DEC-001

- **Priority:** P2.
- **Vị trí:** `docs/USER_STORIES.md:149-151`,
  `docs/PROGRESS.md:38,71-79`,
  `docs/PRODUCT_REQUIREMENTS.md:315-350`,
  `docs/TECHNICAL_SPEC.md:30-32`.
- **Impact:** Tài liệu vẫn nói runtime gọi provider/hai mục vẫn public/platform
  còn mở; schema vừa được ghi in-scope trong Progress vừa deferred trong spec.
- **Recommendation:** PM cập nhật current-state và Sprint scope sau khi
  verification hoàn tất; DEC-001 phải là nguồn quyết định platform.

### Criteria PM có thể check

- Có thể check **US-008** criterion “không có evidence → `unavailable`, không gọi
  AI kiến thức mở” dựa trên `app/api/chat/route.ts:52-60` và static review.
- Có thể check **US-016** criterion tạm ngừng hai mục NĐ 131 khỏi static public và
  retrieval dựa trên các filter hiện tại, nhưng ghi rõ đây là mitigation.
- Chưa check Sprint 1A criterion regression “public page/API/chat” hoặc test
  criterion của US-021: thiếu D1/API coverage và chưa chạy suite.
- Không check US-015/schema foundation: delivery đã deferred và không có
  migration evidence.

### Verification

- `git diff --check`: pass. Không chạy được lint/typecheck/test/build vì môi
  trường không có `node`, `npm` hoặc `node_modules`.

## 11. Sprint 1B citation foundation — final review

### Kết luận

- **PASS local foundation:** migration expand-only tạo `legal_sources`,
  `legal_provisions`, `legal_entry_citations`, index, foreign key, constraint
  và trigger cần thiết.
- **PASS DEC-004:** `official_host` được canonicalize riêng; HTTPS authority
  phải khớp host và allowlist chặn suffix/path/query/fragment giả.
- **PASS DEC-003 ở tầng dữ liệu mới:** người tạo khác người kiểm chứng/duyệt;
  `created_by` bất biến sau insert nên không thể đổi actor rồi tự duyệt.
- **PASS source validity:** provision chỉ được `published` với source
  `in_force` đã kiểm chứng; khi source mất điều kiện, provision tự về
  `pending_review` và xóa metadata duyệt.
- **PASS migration local:** migration chạy lặp an toàn, journal đúng thứ tự,
  foreign-key/integrity checks pass và không chứa seed/mapping pháp lý.
- **BLOCKED production:** Sites project trong `.openai/hosting.json` hiện không
  resolve được qua kiểm tra read-only. D1 binding, việc migration chạy đúng một
  lần và migration-before-activation chưa được xác minh.

### Evidence

- `drizzle/0001_citation_foundation.sql`
- `db/schema.ts`
- `db/index.ts`
- `tests/schema-foundation.test.mjs`
- `docs/MIGRATION_RUNBOOK.md`
- Bundled Node schema suite: **13 pass, 0 fail, 0 skip**.
- `git diff --check`: pass.

### Findings đã đóng qua quy trình bốn mắt

1. Allowlist ban đầu có thể bị giả bằng query/fragment; đã chuyển sang
   `official_host` và exact authority delimiter, có behavioral tests.
2. Source hết hiệu lực ban đầu không hạ trạng thái provision; đã thêm
   source-invalidation trigger và test.
3. Four-eyes ban đầu có thể bypass bằng sửa `created_by`; đã thêm trigger bất
   biến cho source/provision và test Alice → Bob → tự duyệt.
4. Database tests ban đầu có thể silently skip; suite hiện import
   `node:sqlite` trực tiếp và fail nếu runtime không hỗ trợ.
5. Runbook ban đầu overclaim migration execution; hiện chỉ công nhận packaging
   evidence và chặn production cho tới khi control plane được xác minh.

### Khoảng trống còn lại

- Chưa có seed/backfill hoặc mapping sang Nghị định 341; đây là chủ ý của Sprint
  1B và phải qua người duyệt nội dung nội bộ.
- API/CMS/retrieval chưa tích hợp các bảng citation mới.
- Full build, lint, typecheck và rendered/E2E suite chưa chạy do workspace không
  có `node_modules` và chưa có `dist/server/index.js`.
- Không có blocker/high/medium còn lại trong patch schema local sau lượt review
  cuối; blocker duy nhất là external deployment/control-plane nêu trên.
