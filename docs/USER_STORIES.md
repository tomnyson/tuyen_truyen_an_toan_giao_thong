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
- [ ] Endpoint v1 trả contract versioned với `requestId`,
  `mode=curated|ai_assisted|unavailable`, `confidence`, `answer`, `sanctions`
  và `citations`; không dùng mode legacy `knowledge` hoặc parse text tự do để
  dựng field/citation.
- [ ] Mọi câu trả lời đủ điều kiện đều có ít nhất một citation và một example.
- [ ] `curated`/`ai_assisted` chỉ được trả khi canonical answer key đã
  deduplicate, citation/provision/source revision hợp lệ và example thuộc đúng
  answer revision; thiếu bất kỳ phần bắt buộc nào trả contract `unavailable`
  ổn định với mảng rỗng.
- [ ] Frontend render từng phần với nhãn rõ ràng.
- [ ] Frontend không render HTML từ answer, link nguồn chỉ lấy từ citation
  HTTPS đã validate, mở an toàn và hiển thị loading/error/unavailable rõ ràng;
  keyboard/screen-reader đọc được từng section.
- [ ] `/api/chat` legacy chạy song song trong deprecation window; frontend chỉ
  cutover sang v1 sau contract/integration/telemetry tests và có rollback flag.
- [ ] Contract tests bao phủ curated, ai-assisted fixture, unavailable,
  malformed input, missing example/citation, unknown/duplicate evidence ID,
  canonical numeric/date/article mapping, schema field thừa/thiếu và
  `429`/`503` không bị render thành answer.
- [ ] Shadow result không được dùng để dựng hoặc thay đổi response v1/current.
  `mode=ai_assisted` chỉ được trả trực tiếp sau khi US-025 có
  `validatedEvidenceBundle` từ production graph và US-026 có server-side
  claim/span validation, canonical DB citation/sanction assembly, negative
  tests, evaluation gate đã duyệt và rollout/cutover evidence.

**Evidence hiện có:** `lib/legal-content.ts`, `app/api/chat/route.ts`,
`app/page.tsx`. AC/spec đã được refine trước code; US-004 phụ thuộc US-003,
US-017 và validated bundle/citation assembly của US-025, còn nhánh AI phụ thuộc
US-008/US-026. Không check AC mới từ fixture hoặc text legacy.

### [x] US-005 — Xem đầy đủ case study được xuất bản

- **Priority:** P1
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn đọc đầy đủ các tình huống cảnh báo đã được
  xuất bản, không chỉ thấy tiêu đề.

**Acceptance criteria**

- [x] Public API chỉ trả showcase `published`.
- [x] Trang public tải showcase quản trị.
- [x] Render danh sách theo dữ liệu thay vì cố định hai vị trí đầu.
- [x] Hiển thị summary, topic và URL nguồn.
- [x] Có trang/modal chi tiết và trạng thái rỗng.
- [x] Renderer dùng toàn bộ DTO theo thứ tự deterministic từ API, không đọc
  `showcases[0]`/`[1]`, không giới hạn ngầm hai item và không dùng array index
  làm identity.
- [x] Showcase public chỉ đủ điều kiện khi có title/topic/summary không rỗng và
  `sourceUrl` HTTPS đã validate theo exact authority policy DEC-004; link dùng
  `target="_blank"` + `rel="noreferrer"` và record lỗi không được render như đã
  xuất bản.
- [x] UI phân biệt loading, success-empty và dependency-error. D1 lỗi không
  được giả thành success-empty; có thể hiển thị degraded state nhưng không dựng
  showcase fallback chỉ từ title hard-code thiếu summary/source.
- [x] Modal/detail hiển thị đúng full summary, topic và source của item được
  chọn; đóng bằng nút/Escape, quản lý focus và trả focus về trigger.
- [x] Component/integration tests bao phủ 0, 1 và ít nhất 3 showcase, API order,
  draft/invalid-source exclusion, đúng item khi mở/đóng modal và degraded state.

**Evidence:** `lib/public-showcase.ts` project defense-in-depth chỉ record
`published` có ID hợp lệ, đủ field và source HTTPS đúng DEC-004; projector giữ
API order, loại duplicate/invalid và handler trả 503 + `Cache-Control: no-store`
khi dependency lỗi. `app/api/content/route.ts` query deterministic theo
`updatedAt,id`; `app/page.tsx` phân biệt loading/empty/degraded và không dựng
fallback card. `components/ShowcaseGallery.tsx` render toàn bộ DTO theo stable
ID, source link an toàn và detail dialog đúng item, có button/Escape, focus trap,
initial focus và return focus. `tests/public-showcase.test.mjs` chạy 15/15 cho
0/1/3 item, order, draft/invalid/extraneous-field exclusion, states,
modal/reducer/Escape/focus recovery; full
suite 198/198, typecheck, lint và build pass ngày 2026-07-31. US-005 không tự
giải quyết merge/dedup/content key; US-017 sẽ thay resolver/identity projection
mà không đổi contract hiển thị.

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
`lib/legal-chat.ts`; `tests/rendered-html.test.mjs` đã chạy 15/15 pass nhưng
chưa đủ bốn nhóm kiến thức nền.

### [x] US-007 — Fail closed khi không đủ kiến thức

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn hệ thống nói rõ khi chưa đủ dữ liệu thay vì
  đưa ra câu trả lời pháp lý không chắc chắn.

**Acceptance criteria**

- [x] Không có dữ liệu và không có AI thì trả mode `unavailable`.
- [x] Lỗi xử lý/provider cũng rơi về câu trả lời an toàn.
- [x] Câu hỏi rỗng hoặc message sai định dạng bị từ chối.
- [x] Có regression test đã chạy pass cho nhánh ngoài phạm vi và input không
  hợp lệ.

**Evidence:** `app/api/chat/route.ts`;
`tests/rendered-html.test.mjs` chạy 15/15 pass, gồm ngoài phạm vi, empty request
và malformed messages.

### [ ] US-027 — Tìm nguồn được phép khi kho dữ liệu chưa có câu trả lời

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, khi kho dữ liệu chưa có câu trả lời, tôi muốn trợ lý
  tìm trên các nguồn pháp luật được cho phép và cho tôi biết rõ đây là kết quả
  tra cứu trực tuyến chưa qua quy trình kiểm duyệt nội dung.

**Acceptance criteria**

- [x] `/api/chat` chỉ gọi web search sau khi cả managed và curated retrieval
  không match; safety intent vẫn chạy trước và không bị thay thế.
- [x] Web search mặc định tắt, chỉ bật với exact
  `AI_WEB_SEARCH_ENABLED=true`, có API key và model thuộc exact allowlist.
- [x] Request dùng Responses API `web_search`, `tool_choice=required`,
  `store=false`, domain filter cố định phía server và yêu cầu complete sources;
  không nhận domain, instruction, tool hoặc provider URL từ client.
- [x] Nguồn trả lời trực tiếp chỉ gồm HTTPS URL thuộc `vbpl.vn`,
  `vbpl.moj.gov.vn`, `chinhphu.vn` hoặc subdomain chính thức. Kết quả không có
  ít nhất một `url_citation` chính thức trong final answer phải trả
  `unavailable`.
- [x] `thuvienphapluat.vn` không nằm trong direct-search domain list; chỉ dành
  cho backoffice discovery tên/số văn bản, không được hiển thị như căn cứ cuối
  cùng và không đủ điều kiện trả lời nếu chưa tìm được nguồn Chính phủ.
- [x] Chỉ gửi câu hỏi cuối đã normalize và redaction email/số điện thoại/URL;
  không gửi lịch sử hội thoại, cookie, request ID hay dữ liệu quản trị.
- [x] Response có `mode=web_search`, cảnh báo “tra cứu trực tuyến, chưa được
  kiểm duyệt”, và danh sách nguồn Chính phủ có link bấm được. Không lưu kết quả
  web vào corpus hoặc tự xuất bản.
- [x] Timeout, HTTP lỗi, refusal, malformed/oversized output, model mismatch,
  URL ngoài allowlist hoặc thiếu official citation đều fail closed về response
  `unavailable` hiện có.
- [x] Có adapter/route/UI tests cho flag off, missing key, success có official
  citation, discovery-only citation, malicious URL, timeout và curated-first.
- [ ] Trước production phải duyệt data-control/under-18 disclosure, budget,
  rate limit, telemetry, Terms của nguồn discovery và rollback flag.

**Decision (2026-07-31):** Chủ dự án cho phép live search khi retrieval không
match. DEC-010 thay đổi riêng phần “không live-search” của DEC-002/DEC-006:
direct fallback chỉ được trả với citation Chính phủ đã qua exact server-side
URL guard; `thuvienphapluat.vn` là discovery-only; mọi failure tiếp tục
`unavailable`. Kết quả không trở thành reviewed RAG evidence và không đi qua
four-eyes cho đến khi được ingest thành draft riêng.

**Evidence:** `lib/openai-web-search.ts` có strict flag/model/config, redaction,
fixed hosted-tool request, bounded response parser và exact official citation
guard. `app/api/chat/route.ts` nối curated-first fallback;
`lib/official-source-url.ts` và `app/page.tsx` validate/render warning cùng
official links; `.env.example` giữ rollback flag mặc định false.
`tests/openai-web-search.test.mjs` chạy 12/12, typecheck, lint và build pass
ngày 2026-07-31. Story giữ `Partial` vì production data-control,
under-18 disclosure, budget/rate limit/telemetry và rollout review còn mở.

### [ ] US-028 — Lưu, duyệt và tái sử dụng kết quả tra cứu trực tuyến

- **Priority:** P0
- **Persona:** Biên tập viên, người duyệt nội dung nội bộ, học sinh
- **Mô tả:** Là đội nội dung, chúng tôi muốn kết quả tra cứu trực tuyến đủ nguồn
  chính thức được lưu thành ứng viên bản nháp, qua quy trình bốn mắt và chỉ sau
  đó mới trở thành dữ liệu RAG có thể tái sử dụng.

**Acceptance criteria**

- [x] Sau web-search thành công, backend lưu answer, model, usage và URL Chính
  phủ đã canonicalize vào D1 trước khi trả response; persistence lỗi fail
  closed.
- [x] Không lưu raw question, message history, cookie, IP, email, số điện thoại
  hoặc provider body; chỉ có request ID server-side và checksum nội dung.
- [x] Candidate mặc định `draft`; answer/source gốc, revision và history không
  thể sửa/xóa. Chỉ principal active có role `editor|admin` được tạo revision.
- [x] Editor bổ sung topic/title/tags và citation metadata gồm số hiệu văn bản,
  điều/khoản/điểm, hiệu lực và ngày kiểm chứng; URL phải khớp source ban đầu.
- [x] Workflow là `draft → pending_review → published → archived` hoặc
  `pending_review → rejected → draft`; reviewer active phải khác editor,
  rejection có lý do và mọi mutation có immutable audit event.
- [x] Session nội bộ resolve username thành stable `principalId`; role đọc từ
  D1, không tin actor/role client gửi. Registry nhiều account chỉ ở server.
- [x] Chỉ candidate `published`, citation còn hiệu lực và trong freshness
  window được retrieval trước live web fallback; draft/rejected/archived không
  được trả.
- [x] CMS có danh sách candidate, form revision, gửi duyệt,
  approve/reject/archive theo role và lịch sử.
- [x] Web-search có global daily token budget fail-closed trong D1 và telemetry
  allowlist cho provider model/usage/candidate ID; không log nội dung.
- [x] Migration, workflow negative tests, persistence/retrieval, RBAC/API,
  typecheck/lint/build chạy pass.
- [ ] Production gate: apply migration trước code/flag, seed hai principal khác
  nhau cùng role grant, cấu hình budget, Workers Logs và chạy D1 smoke; hoàn tất
  data-control/under-18 review.

**Decision (2026-07-31):** DEC-011 thay phần “không persist” của DEC-010 bằng
quyền hẹp: chỉ persist server-validated web result thành immutable draft, không
lưu raw question và không tự publish. Candidate chỉ vào reviewed RAG corpus sau
authenticated four-eyes approval.

**Evidence local:** `drizzle/0005_web_search_candidate_workflow.sql`,
`db/schema.ts`, `lib/web-search-candidates.ts`,
`app/admin/api/web-search-candidates/route.ts`,
`app/admin/AdminDashboard.tsx`, `lib/admin-auth.ts`, `app/api/chat/route.ts`,
`lib/telemetry.ts`, `.env.example` và
`docs/WEB_SEARCH_REVIEW_RUNBOOK.md`. Focused candidate workflow **4/4**,
combined auth/web/candidate **24/24**, full suite **230/230**, typecheck, ESLint
và Vinext build 5/5 pass ngày 2026-07-31. Story giữ `Partial` vì production
migration/principal/data-control/under-18/Workers Logs/D1 smoke chưa có
evidence.

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
kiểm tra credential không tạo outbound call đã chạy pass trong
`tests/rendered-html.test.mjs`. `lib/openai-evidence.ts` có evidence-only
composition guard và 15/15 tests pass, nhưng D1 validated bundle,
canonical citation/sanction assembly và runtime integration vẫn chưa triển khai.

### [x] US-009 — Phân biệt câu hỏi ảnh riêng tư và bản quyền

- **Priority:** P0
- **Persona:** Học sinh
- **Mô tả:** Là học sinh, tôi muốn câu hỏi về phát tán ảnh riêng tư nhận hướng
  dẫn an toàn phù hợp, không bị hiểu nhầm thành câu hỏi bản quyền.

**Acceptance criteria**

- [x] Kho nội dung nền có một mục riêng về phát tán hình ảnh riêng tư.
- [x] Prompt có hướng dẫn an toàn cho ảnh nhạy cảm.
- [x] Intent/ranking phân biệt quyền riêng tư với quyền tác giả.
- [x] Keyword chung `hình ảnh` không tự động chọn câu trả lời bản quyền.
- [x] Có regression test cho cả hai intent.
- [x] Classifier deterministic, versioned và dùng Unicode normalization +
  token/phrase boundary; trả `privacy_safety|copyright|unknown` cùng reason
  allowlist, không dựa vào substring `hình ảnh` đơn lẻ hoặc thứ tự record mới
  cập nhật.
- [x] Dấu hiệu phát tán không đồng thuận/ảnh riêng tư/nhạy cảm/bạn học/nhóm lớp
  ưu tiên `privacy_safety`; dấu hiệu tác giả/tác phẩm/giấy phép/sử dụng lại/ghi
  nguồn ưu tiên `copyright`. Câu mixed có nguy cơ riêng tư phải chạy safety
  action trước; câu mơ hồ trả `unknown`/`unavailable`, không đoán.
- [x] Retrieval chỉ nhận answer có intent tag khớp classifier và đạt eligibility
  hiện hành. Khi corpus copyright chưa có record đã duyệt, copyright intent trả
  `unavailable`, không bị map sang privacy; privacy intent không được trả answer
  bản quyền hoặc managed weak-match.
- [x] Privacy response ưu tiên dừng chia sẻ, không phát tán thêm, lưu bằng chứng
  an toàn và báo phụ huynh/giáo viên/cơ quan phù hợp; không yêu cầu gửi ảnh,
  danh tính, trường/lớp hoặc dữ liệu nhạy cảm cho hệ thống.
- [x] Table-driven tests có dấu/không dấu và negative pairs cho: ảnh riêng tư
  bị phát tán, ảnh nhạy cảm trong nhóm lớp, xin phép tác giả dùng ảnh cho bài
  học, ghi nguồn/giấy phép, từ chung “hình ảnh”, mixed privacy+copyright và
  managed candidate cạnh tranh.

**Evidence:** `lib/image-intent.ts` triển khai classifier
`image-intent-v2`, dual normalized representation giữ dấu + folded tiếng Việt,
phrase boundary, reason allowlist, privacy precedence và safe guidance có
intent tag. Dual representation không coi đại từ `Anh` là ảnh; accentless
`Hinh ... bị phát tán` và `anh nong ... bị phát tán` chỉ được nhận nhờ passive
risk guard. Generic image mặc định `ambiguous`; chỉ qualifier nghiệp vụ giao
thông thuộc allowlist mới tiếp tục retrieval. Peer/lớp không tự tạo privacy nếu
thiếu sharing/non-consent/passive/sensitive risk.
`app/api/chat/route.ts` chạy gate trước legacy managed/curated retrieval:
privacy trả guidance an toàn, copyright chưa có reviewed intent-tagged record và
câu ảnh mơ hồ đều fail closed `unavailable`. `tests/image-intent.test.mjs` chạy
39/39, gồm có dấu/không dấu, mixed consent+authorship precedence, exact `Anh`
negative pairs,
image-subject + non-consent/passive misuse, author-permission boundary,
generic filler variants với managed candidate cạnh tranh, traffic/classroom
qualifier và không yêu cầu upload/dữ liệu nhạy cảm. Current full suite 198/198,
typecheck, lint và build đều pass
ngày 2026-07-31.

## Epic C — Quản trị nội dung

### [x] US-010 — Đăng nhập và bảo vệ khu vực quản trị

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị viên, tôi muốn khu vực biên tập chỉ truy cập được bằng
  phiên đăng nhập hợp lệ.

**Acceptance criteria**

- [x] Người chưa đăng nhập bị chuyển đến trang login.
- [x] Credential hợp lệ tạo session ký HMAC, hết hạn sau 8 giờ.
- [x] Cookie có `HttpOnly`, `SameSite=Strict` và `Secure` trên HTTPS.
- [x] Mutation kiểm tra origin cùng site.
- [x] Có test đã chạy pass cho login sai, login đúng và truy cập admin.

**Evidence hiện có:** `lib/admin-auth.ts`, `app/admin/page.tsx`,
`app/admin/api/login/route.ts`, `app/admin/api/logout/route.ts`,
`tests/rendered-html.test.mjs` chạy 15/15 pass, gồm redirect anonymous, login
sai, session hợp lệ và admin access.

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
- [x] Có test quyền và state transition ở tầng trust-primitives; authenticated
  API E2E vẫn được theo dõi riêng tại US-021.
- [x] Có foundation identity-neutral lưu principal ổn định, role grant và trạng
  thái active/disabled; không coi chuỗi actor tự khai trong request là danh tính
  đã xác thực.
- [x] Review request chỉ được quyết định bởi principal active có role
  `reviewer`/`admin`, khác creator và submitter, trên đúng revision hiện hành.

**Decision (2026-07-29):** DEC-003 chốt quy trình bốn mắt
`editor != reviewer` là bắt buộc. Reviewer là người duyệt nội dung nội bộ, không
nhất thiết là luật sư.

**Evidence hiện có:** `db/schema.ts`,
`drizzle/0001_citation_foundation.sql` và `db/index.ts` áp dụng
`verified_by != created_by`, `reviewed_by != created_by` cùng trigger không cho
đổi `created_by`. `tests/schema-foundation.test.mjs` đã chạy pass các case
four-eyes và immutable creator. Runtime CMS vẫn chưa có role/reviewer API,
attribution hoặc state-transition workflow nên story còn `Partial`.

**Delivery slice 3 (2026-07-31):** sidecar
principal/role/revision/review/audit và constraint bốn mắt độc lập nhà cung cấp
danh tính đã được triển khai. `tests/editorial-workflow-schema.test.mjs` chạy
13/13 pass; final code review không còn blocker/high/medium trong phạm vi slice.
Chưa nối login, CMS API, public/chat hoặc tự promote graph 0002. Runtime RBAC
chỉ được check sau khi session resolve được stable actor từ local hashed
registry hoặc identity provider đã chốt.

### [ ] US-014 — Xem lịch sử và phiên bản nội dung

- **Priority:** P1
- **Persona:** Người duyệt nội dung nội bộ
- **Mô tả:** Là người duyệt, tôi muốn biết ai thay đổi nội dung nào và có thể so
  sánh phiên bản để kiểm tra trách nhiệm biên tập.

**Acceptance criteria**

- [x] Có version table hoặc immutable revision log.
- [ ] Mỗi thay đổi lưu actor, timestamp, before/after và lý do.
- [ ] CMS hiển thị lịch sử theo record.
- [ ] Nội dung đã xuất bản được archive thay vì mất dấu bằng hard delete.
- [x] Revision, review decision và audit event của sidecar không thể
  `UPDATE`/`DELETE`; operation ID chống ghi trùng và audit tham chiếu đúng
  subject/revision/request.
- [x] Có test database chứng minh self-review, stale revision, duplicate
  decision và sửa/xóa lịch sử đều bị từ chối.

**Evidence:** `drizzle/0003_editorial_trust_primitives.sql`, `db/schema.ts`,
`tests/editorial-workflow-schema.test.mjs` (**13/13 pass**) và
`docs/MIGRATION_RUNBOOK.md`. Story còn `Partial` vì chưa có history UI, archive
runtime và audit cho mọi thay đổi CMS.

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
- [ ] Mỗi law/showcase có immutable `contentKey` dạng `law:<slug>` hoặc
  `showcase:<slug>` do editor/migration khai báo; không sinh lại từ
  title ở read path, không dùng offset ID như `100_000 + id`, và có unique
  constraint theo entity/key.
- [ ] Resolver dùng một policy versioned chung cho public API/page/chat:
  eligible managed `published` cùng key thay thế static; managed
  draft/pending-review không che static; blocklist/invalidation hoặc durable
  suppression đã duyệt không được làm static cũ xuất hiện lại.
- [ ] Repository trả dependency snapshot đúng ba trạng thái:
  `available_records`, `available_empty`, `unavailable`. `available_empty` là
  query thành công và vẫn resolve static baseline trừ suppression với
  `dataState=ready`; đây không phải outage fallback. Chỉ `unavailable` dùng
  degraded fallback.
- [ ] Public API degraded contract cố định: HTTP `200`,
  `{ dataState: "degraded", resolverPolicyVersion, laws, showcases }`,
  `Cache-Control: no-store` và cùng `X-Request-ID`; không trả dependency detail.
  Fallback chỉ dùng static eligible sau reviewed suppression snapshot. Snapshot
  suppression thiếu/sai/stale thì fail closed về mảng rỗng, không làm static bị
  retire xuất hiện lại.
- [ ] Backfill key/override là migration/review packet tường minh; collision,
  orphan hoặc nhiều managed published record cùng key fail closed và được báo
  cáo, không tự chọn record mới nhất hay tự gộp theo title. `Orphan` chỉ là
  legacy/static row thuộc backfill manifest bị thiếu/sai mapping hoặc trỏ target
  không tồn tại; managed-only record có key hợp lệ là nội dung mới, không phải
  orphan.
- [ ] Archive/suppression của content từng published/keyed tạo tombstone
  durable bind exact key/revision, actor, reason và review/audit; key không được
  tái sử dụng. Không hard-delete content từng published/keyed. Hard-delete chỉ
  cho draft chưa được cấp key, chưa từng publish, không citation/reference và
  vẫn phải audit.
- [ ] Thứ tự public deterministic theo topic/display order/content key, không
  phụ thuộc `updatedAt`; resolver không mutate input và không trả duplicate key.
- [ ] Unit/integration tests bao phủ managed override, draft không override,
  managed-only key, durable suppression/no-resurrection, duplicate/collision,
  orphan definition, ba dependency snapshot, degraded API headers/shape,
  suppression snapshot stale fail-closed và cùng kết quả ở page/chat/API.
- [ ] Production activation gate: expand-only migration/backfill/suppression
  ledger đã apply trước code trên actual D1; actor/review decision được xác thực
  từ authenticated durable ledger và fallback export có signature/MAC
  verification; collision report, dual-read shadow, restore/rollback và API
  smoke đã verify.
- [x] **Local-only feasibility slice:** pure `catalog-resolver-v1` nhận
  dependency snapshot ba state, static catalog version, managed records,
  suppression metadata và optional backfill mapping; validate immutable
  `contentKey`, override/draft/managed-only, suppression/tombstone,
  collision/orphan, deterministic order và không mutate input. Unavailable chỉ
  trả static degraded khi fallback suppression snapshot độc lập đúng
  policy/catalog/version/expiry, có hai actor label khác nhau về mặt cấu trúc và
  khớp SHA-256; thiếu/sai/stale/hash mismatch trả empty degraded. SHA-256 không
  có khóa này chỉ kiểm toàn vẹn payload, không xác thực actor hoặc chứng minh
  four-eyes. Response factory tạo exact DTO `200/no-store` nhưng chưa được nối
  route/page/chat. AC này không hoàn thành authenticated reviewed ledger/export
  signature, migration, parity hay production activation phía trên.

**Evidence local:** `lib/catalog-resolver.ts`,
`fixtures/catalog/static-catalog.v1.json` và
`tests/catalog-resolver.test.mjs` (**20/20 pass**). Full suite 198/198,
typecheck, lint, build và diff check pass ngày 2026-07-31. Resolver fail closed
khi duplicate key, many-to-one backfill, true orphan, invalid suppression hoặc
mọi managed record non-eligible thiếu matching tombstone; khi có tombstone thì
record bị ẩn bất kể draft/pending/published/archived. Public factory map mọi
`failed_closed` sang degraded/no-store và resolver snapshot scalar/fallback
fields trước async hash. Managed-only key không bị coi là orphan.
`app/page.tsx`, API và chat vẫn chưa consume resolver; chưa có authenticated
ledger/signature, migration/backfill/D1 activation nên story giữ `Partial`.

## Epic E — Bảo mật, vận hành và chất lượng

### [x] US-018 — Lưu mật khẩu quản trị an toàn

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị hệ thống, tôi muốn password được lưu dưới dạng hash có
  salt và tài liệu môi trường khớp code.

**Acceptance criteria**

- [x] Secret được đọc server-side từ environment.
- [x] Implementation dùng `ADMIN_PASSWORD_HASH`, không dùng plaintext.
- [x] Đã loại bỏ credential `admin/admin` khỏi `.env.example`.
- [x] `.env.example` chỉ mô tả hash runtime đang hỗ trợ và không khai báo
  plaintext `ADMIN_PASSWORD`.
- [x] Có quy trình tạo/rotate credential.
- [x] Test xác thực hash đúng/sai, format malformed, cấu hình thiếu và plaintext
  legacy bị bỏ qua.

**Evidence:** `lib/password-hash.ts`, `lib/admin-auth.ts`,
`scripts/generate-admin-password-hash.mjs`, `.env.example`,
`docs/ADMIN_CREDENTIAL_ROTATION.md`, `tests/admin-auth.test.mjs` và regression
login/session trong `tests/rendered-html.test.mjs`.

### [ ] US-019 — Chống lạm dụng login và chat

- **Priority:** P0
- **Persona:** Quản trị hệ thống
- **Mô tả:** Là quản trị hệ thống, tôi muốn giới hạn request và chống brute force
  để bảo vệ tài khoản và ngân sách AI.

**Acceptance criteria**

- [x] Policy server-side bất biến `rate-limit-v1`: login giới hạn 5 attempt/15
  phút theo client+username, 20 attempt/15 phút theo client và 20 attempt/60
  phút theo account; chat giới hạn 20 request/60 giây và 200 request/ngày UTC
  theo client. Client không được override; production threshold chỉ đổi qua
  decision record và test.
- [x] Login backoff không sleep Worker: sau lần sai thứ 3 block 2 giây, lần 4
  block 4 giây, lần 5 block đến hết cửa sổ 15 phút. Login thành công reset
  consecutive-failure pair nhưng không hoàn IP/account quota; response sai
  credential không tiết lộ username tồn tại.
- [x] Client identity chỉ đọc `CF-Connecting-IP`, bỏ qua
  `X-Forwarded-For`; IPv4 và IPv6 `/64` được normalize rồi HMAC-SHA-256 bằng
  `RATE_LIMIT_KEY_SECRET` server-only tối thiểu 32 byte và scope separation.
  Username cũng normalize/HMAC. DB/log không lưu raw IP, username, token, câu
  hỏi hoặc message.
- [x] Thiếu/sai secret, thiếu trusted client identity hoặc D1/dependency lỗi
  đều fail closed trước credential verification/retrieval/provider: trả 503
  generic, `Retry-After: 5`, `Cache-Control: no-store`.
- [x] Migration D1 tạo bucket/penalty state có expiry/index; consume dùng atomic
  UPSERT/RETURNING, multi-bucket decision nằm trong một batch/transaction, không
  read-then-write. Client/account/pair-attempt capacity được reserve trước
  PBKDF2; concurrent request không vượt threshold. Pair penalty/reset dùng HMAC
  scope riêng và exact `state_version` CAS.
- [x] Vượt limit trả 429 generic, `Retry-After` integer theo `blockedUntil` và
  `Cache-Control: no-store`; window boundary dùng injected clock và response
  không lộ key/count nội bộ.
- [x] Logical expiry làm bucket hết hạn không còn tham gia decision; bounded lazy
  cleanup idempotent xóa tối đa 100 bucket/penalty mỗi batch. Telemetry chỉ cho
  phép scope, outcome, policy version, retryAfter và requestId; không log
  key/hash.
- [x] Focused tests bao phủ migration/idempotency, threshold ±1, rollover,
  backoff/reset, IP/account/pair isolation, IPv6 `/64`, spoofed XFF, HMAC/no raw
  data, 429/503, missing secret/identity, D1 failure, concurrent atomicity,
  daily quota, cleanup và denied request không chạy auth/retrieval/provider.
- [ ] Production gate: migration apply-before-code trên actual D1, Cloudflare
  header behavior, concurrent smoke và telemetry đã verify; production
  thresholds được phê duyệt; scheduled sweep chứng minh physical retention tối
  đa 25 giờ cho daily chat và 61 phút cho account state cộng bounded grace.

**Evidence local:** `drizzle/0004_rate_limit_v1.sql`, `db/schema.ts`,
`lib/rate-limit.ts`, guards trong `app/admin/api/login/route.ts` và
`app/api/chat/route.ts`, `.env.example`, `cloudflare-env.d.ts`,
`tests/rate-limit.test.mjs` và D1 mock trong `tests/rendered-html.test.mjs`.
Focused suite kiểm policy/atomicity/failure paths; production gate vẫn mở nên
story giữ `Partial`.

### [ ] US-020 — Log an toàn và quan sát được luồng trả lời

- **Priority:** P1
- **Persona:** Quản trị hệ thống, PM
- **Mô tả:** Là đội vận hành, chúng tôi muốn biết response dùng record/citation
  nào và lỗi xảy ra ở đâu mà không lưu dữ liệu cá nhân không cần thiết.

**Acceptance criteria**

- [x] Outer Worker tạo `requestId = crypto.randomUUID()`, ghi đè mọi ID client,
  truyền nội bộ và trả `X-Request-ID` cho mọi response. Route direct-test chỉ
  được tạo fallback server-side; không dùng provider response ID làm app ID.
- [x] Structured event dùng typed exact allowlist `telemetry-v1`: timestamp,
  requestId, static route/event ID, method, status, outcome/mode, latency,
  policy/ranking/freshness version, bounded internal record/citation IDs và
  allowlisted provider outcome/latency/usage. Unknown field bị drop/reject.
- [x] Không event/sink nào chứa raw URL query, request/response body, question,
  messages/evidence/legal text, cookie/header, password/hash, session/API key,
  raw IP, username/email, rate-limit HMAC key/hash, provider body/refusal,
  exception message hoặc stack. Error chỉ map thành stable enum.
- [x] Instrument tối thiểu một `http.response_ready` ở outer Worker,
  `chat.completed` ở chat và `auth.login` ở login; không duplicate provider
  event. Chỉ log retrieved/citation IDs sau khi retrieval trả metadata có cấu
  trúc, không tạo ID giả từ answer text.
- [x] Application local phát 100% event hợp lệ, không nhận sampling override từ
  client; policy/runbook đề xuất Workers Logs MVP dùng 100% sampling ở lưu lượng
  thấp. Thay đổi sampling phải có policy/version và metric caveat. Security
  audit bắt buộc không dựa vào platform head-sampling; editorial audit thuộc
  US-014.
- [x] Policy/runbook quy định retention MVP là 3 ngày trên Workers Logs,
  least-privilege access, không Logpush/export hoặc lưu D1 khi chưa có approval
  riêng. Không lưu raw question ở bất kỳ retention tier nào.
- [x] Query/runbook bao phủ volume/status, p50/p95 latency, mode/unavailable,
  retrieval no-match, provider stable error, login failure và 429/503; mỗi
  query ghi timezone/sampling caveat và alert owner.
- [x] Telemetry sink inject được; serialization/sink failure không đổi HTTP
  result và không fallback log raw object/stack.
- [x] Focused tests bao phủ request ID overwrite/propagation/uniqueness,
  allowlist/bounds, canary secret/PII exclusion, safe error mapping, sink
  failure và 200/400/401/403/429/503 paths; full suite vẫn pass.
- [ ] Khi US-025/US-026 được nối vào chat, `chat.completed` phải nhận metadata
  có cấu trúc từ validated bundle/provider owner và phát canonical
  answer/provision/citation IDs cùng provider outcome/latency/token usage đã
  allowlist; không suy ID từ answer text. Integration test và query smoke phải
  chứng minh các event dùng cùng `requestId`, IDs khớp response/evidence trong
  D1 và mỗi provider call chỉ có một owner phát telemetry.
- [ ] Production gate: đúng Sites project đã bật Workers Logs; retention/access
  và sampling được verify; response request ID tìm được log tương ứng; query
  runbook, no-secret canary và alert smoke đã chạy.

**Evidence local:** `lib/telemetry.ts`, `lib/worker-observability.ts`, outer
wrapper trong `worker/index.ts`, instrumentation tại
`app/admin/api/login/route.ts` và `app/api/chat/route.ts`, correlation an toàn
trong `lib/rate-limit.ts`, `tests/telemetry.test.mjs` và
`docs/OBSERVABILITY_RUNBOOK.md`. Focused suite 12/12, full suite 124/124,
typecheck, lint và Vinext build pass; structured retrieval/provider telemetry
và production gate vẫn mở nên story giữ `Partial`.

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
- [x] Có suite migration/workflow riêng cho role grant, four-eyes,
  revision/request/decision/audit và legacy fail-closed; suite này không thay
  thế API E2E hay rate-limit test.

**Evidence hiện có:** `tests/rendered-html.test.mjs` có regression definitions
cho render, auth, fail-closed copyright, không gọi ungrounded provider và admin
từ chối publish Nghị định 131 trước DB access; suite đã chạy 15/15 pass.
Schema 17/17, editorial workflow 13/13 và retriever D1 fixture 16/16 pass,
nhưng chưa có CRUD/API editor→reviewer workflow E2E, production D1 smoke hoặc
CI execution.

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

- [x] Source registry ghi owner, endpoint/export, format, auth, quota, update
  cadence, trường dữ liệu, availability, terms/license và attribution.
- [x] Mỗi nguồn có cả `trust_class`
  (`official|discovery_only|rejected`) và `readiness`
  (`green|yellow|red|unverified`); static registry từ chối mọi record `green`.
- [ ] Chỉ authenticated PM + internal content reviewer khác người đăng ký được
  persist readiness `green`, kèm durable approval và audit.
- [x] Có sample payload/file và feasibility spike mapping vào
  `legal_sources`/`legal_provisions`.
- [x] Có quyết định go/no-go cùng rủi ro, chi phí và cơ chế xử lý thay thế/xóa.
- [x] Secret/test credential không được commit hoặc ghi log trong registry,
  fixture và spike.

**Decision (2026-07-30):** DEC-006 chốt dữ liệu ngoài không tự động trở thành
citation hoặc được publish. Đánh giá sơ bộ các nguồn Chính phủ hiện biết nằm tại
`docs/THIRD_PARTY_DATA_ASSESSMENT.md`; chưa có provider/API cụ thể đủ đầu vào để
go production.

**Evidence hiện có:** `docs/SOURCE_REGISTRY.md`, `lib/source-registry.ts`,
`fixtures/source-registry/vbpl-nd168.sample.json` và
`tests/source-registry.test.mjs` (8/8 pass). Registry local ghi ba nguồn và
sample chỉ map thành draft có exact URL/anchor/checksum; `green` fail-closed.
Chưa có authenticated/durable approval workflow, terms/license approval hoặc
provider connector nên story còn `Partial`.

### [ ] US-024 — Nhập dữ liệu vào staging/draft có kiểm soát

- **Priority:** P0
- **Persona:** Content Ops, biên tập viên, người duyệt nội bộ
- **Mô tả:** Là đội nội dung, chúng tôi muốn nhập tài liệu ngoài một cách
  idempotent, an toàn và truy vết được mà không vô tình công khai dữ liệu chưa
  duyệt.

**Acceptance criteria**

- [ ] Production ingestion chỉ nhận source registry durable đang active,
  `readiness=green`, có terms/retention được duyệt và đủ hai approval độc lập
  của US-023. Source `yellow`, static fixture hoặc source bị revoke chỉ được
  dùng cho local/manual spike và job phải fail closed trước fetch.
- [ ] Job chỉ được tạo bởi actor nội bộ có quyền hoặc platform schedule đã xác
  thực; provider/endpoint/policy version được resolve server-side từ registry,
  không nhận base URL, credential, allowlist hoặc limit từ request body.
- [ ] Connector/manual import lưu provider, upstream ID/URL, `fetched_at`,
  checksum/version và raw snapshot reference.
- [ ] Raw snapshot immutable lưu R2; editor/reviewer chỉ đọc qua protected
  review API/service binding có RBAC, exact-object authorization, TTL ngắn nếu
  dùng capability URL và audit access.
- [ ] D1 có expand-only migration cho registry/job/raw/candidate/quarantine;
  raw/candidate checksum và R2 object metadata được kiểm tra chéo. Cleanup tuân
  thủ retention/legal hold, không xóa snapshot đang làm provenance cho revision
  published và ghi audit cho mọi delete/tombstone.
- [ ] Fetcher validate HTTPS allowlist, redirect, private IP, MIME, size và
  timeout; có rate limit theo nguồn.
- [ ] URL guard từ chối userinfo/port ngoài policy/IP literal, resolve và pin
  public IP, re-check từng redirect; parser giới hạn compressed/decompressed
  bytes, page count, CPU/memory/time.
- [ ] Manual upload đi qua cùng magic-byte/MIME, size, parser sandbox và
  quarantine policy như remote fetch; không thực thi script, macro, embedded
  file hoặc instruction nằm trong tài liệu.
- [ ] Import idempotent/deduplicate; parser giữ original text và tạo candidate
  source/provision.
- [ ] Queue consumer an toàn với at-least-once delivery: idempotency key và
  transaction/unique constraint ngăn raw/candidate/audit trùng; có lease hoặc
  compare-and-swap chống hai worker xử lý cùng job, bounded retry/backoff và
  poison message sang DLQ. Resume sau crash không được bỏ qua hoặc auto-promote
  bước dang dở.
- [ ] Parser versioned giữ page/section anchor, kiểm tra completeness, xử lý
  PDF không có text/OCR và cho reviewer xem diff candidate với raw snapshot.
- [ ] AI extraction backoffice dùng output schema, chỉ tạo field draft và không
  được tự xác nhận effectivity/citation.
- [ ] Record lỗi/malicious vào quarantine, retry có giới hạn và có báo cáo.
- [ ] Mọi candidate chỉ ở `draft`/`pending_review`; không có đường auto-publish.
- [ ] Four-eyes bắt buộc trước khi candidate trở thành corpus RAG.
- [ ] Upstream update/supersede/delete tạo revision hoặc tombstone và đưa graph
  phụ thuộc về review/invalidate index; không hard-delete hay âm thầm thay
  canonical content. Reprocess luôn bind exact raw checksum, parser/extractor
  version và review decision.
- [ ] Telemetry/audit dùng stable job/source/candidate IDs, state transition,
  count, latency và error code; không log raw document/text, URL query,
  credential, provider payload hoặc exception message/stack. Có runbook query
  backlog/failure/quarantine/DLQ và owner xử lý.
- [ ] Integration fixtures bao phủ duplicate, malformed input, DNS rebinding,
  malicious redirect, malware/polyglot/decompression-bomb PDF, document prompt
  injection, unauthorized raw access, queue redelivery/concurrent lease,
  crash-resume, R2 checksum mismatch, upstream tombstone và no-auto-publish.
- [x] **Local-only feasibility slice:** pure planner nhận exact bốn field
  `{mode, providerKey, sampleRef, createdBy}`, resolve canonical static registry
  và static JSON manifest server-side; caller truyền `fixture` hoặc policy,
  secret, registry, URL/limit override đều bị từ chối. Chỉ record
  `official/yellow/conditional_go` có exact `sampleRef` mới nạp committed
  fixture. Request và validated fixture được copy/freeze trước `await`;
  idempotency v2 hash canonical mọi field fixture bằng length-prefixed SHA-256.
  Mapper chỉ tạo deep-frozen draft plan với `persistence=none`,
  `rawSnapshotRef=null`; production/forged/ineligible source và malformed
  request fail closed bằng stable redacted error. Artifact text chỉ là inert
  draft data, không có network/AI/tool side effect. AC này không hoàn thành bất
  kỳ production AC nào phía trên.

**Evidence local:** `lib/ingestion-local.ts`,
`tests/ingestion-local.test.mjs`, `docs/INGESTION_LOCAL_RUNBOOK.md` và
`npm run test:ingestion-local` (**7/7 pass**). Current full suite 198/198, typecheck,
lint và Vinext build pass. Không có ingestion consumer, connector, raw store,
quarantine, migration hoặc production activation nên story giữ `Partial`.

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
- [x] Migration expand-only giữ row legacy ở trạng thái unverified, đồng thời
  hỗ trợ four-eyes review cho answer-citation relation và provision revision,
  checksum/effectivity canonical; retriever chỉ nhận graph mới khi metadata,
  revision binding và checksum tự kiểm tra đều hợp lệ.
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
`legal_entry_citations` khi đó thiếu review attribution; `legal_provisions`
thiếu revision/checksum/effectivity, nên row D1 legacy bị đánh dấu
`legacy_unverified`/`unknown` và không thể trở thành RAG evidence.

**Evidence:** `lib/legal-evidence-retriever.ts` và
`tests/legal-evidence-retriever.test.mjs`; slice 1 focused suite chạy 14/14 pass,
gồm
fail-closed khi candidate scan bị cắt, canonical revision xung đột, policy bị
caller mutate và metadata không hợp lệ.

**Delivery slice 2 (2026-07-31):** migration 0002 thêm reviewed graph bridge,
immutable provision revision, `provision-sha256-v1`, effectivity canonical và
revision-bound citation. Legacy rows không được backfill/promote. Retriever
recompute checksum bằng Web Crypto và D1 reviewed fixture chỉ tạo internal
candidate.

**Evidence slice 2:** `drizzle/0002_reviewed_rag_bridge.sql`, `db/schema.ts`,
`db/index.ts`, `tests/schema-foundation.test.mjs` (**17/17 pass**) và
`tests/legal-evidence-retriever.test.mjs` (**16/16 pass**). Story `Partial`:
FTS5/alias/index, source revision và partially-in-force spans,
invalidation/re-index jobs, authenticated RBAC/audit review transaction,
validated evidence bundle, production policies và golden-set eval vẫn mở.

**Delivery slice 3 (2026-07-31):** sidecar editorial workflow đã tạo
trust primitives cho actor/role/revision/review/audit. Không nâng candidate
thành evidence bundle và không làm row legacy đủ điều kiện; graph chỉ được nối
approval sau khi có authenticated session boundary và promotion transaction.

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
- [x] Trong adapter/offline slice, `OPENAI_API_KEY` chỉ đọc server-side;
  exact model/feature flag, provider timeout, bounded per-run case/quota và
  content-free token-usage aggregate được tài liệu hóa và có test.
- [ ] Production provider budget, time-window rate limit, circuit breaker,
  approved threshold và cost alert/telemetry chưa được activate.
- [ ] Có defense cho prompt injection từ câu hỏi và source document.
- [x] Có adapter tests cho success, flag-off, missing config, empty/invalid
  bundle, timeout, non-2xx, refusal, malformed structured output và unknown
  evidence ID; numeric/citation smuggling và oversized/streaming body đều fail
  closed.
- [ ] Có semantic validator tests cho hallucination, unsupported claim,
  predicate/span entailment và numeric/date/article mismatch với canonical DB
  record.
- [ ] `/api/chat` hoặc API v1 chỉ được gọi adapter sau khi structured retrieval
  trả validated citation bundle. Trước gate đó route hiện tại phải tiếp tục
  fail closed và test chứng minh credential/flag không gây outbound provider
  call khi không có bundle.
- [x] Offline/local shadow runner dùng `AI_SHADOW_ENABLED` làm canonical flag,
  mặc định/absent/giá trị khác exact `true` là disabled và không được import
  vào `/api/chat` hoặc API v1 trong lát cắt này.
  `OPENAI_API_KEY` hiện có chỉ được đọc server-side; key tồn tại không tự bật
  shadow và flag adapter cũ `AI_REPHRASE_ENABLED` không được tạo activation path
  thứ hai.
- [x] Model policy dùng exact allowlist
  `gpt-5.4-mini|gpt-5.4-mini-2026-03-17`, không prefix/family matching.
  `OPENAI_MODEL` missing/rỗng dùng `gpt-5.4-mini`; local/manual smoke được dùng
  alias, repeatable evaluation/cutover phải pin snapshot.
  `gpt-5.6-sol` và mọi ID khác fail `INVALID_CONFIG` trước outbound call.
  Tests bao phủ default, hai ID hợp lệ, whitespace normalization và unknown ID.
- [x] Offline shadow chỉ gọi provider với committed synthetic technical fixture
  đã version/checksum-bound, có distinct structural review labels và qua
  fixture + adapter eligibility validation. Request luôn `store:false`, không
  khai báo web search/tool và không nhận provider base URL, system instruction
  hoặc conversation từ client. Fixture không được coi là authenticated
  four-eyes, corpus production hay legal review evidence.
- [x] Baseline response được quyết định độc lập với shadow. Shadow success,
  missing key/evidence, timeout, refusal, malformed/schema output, unknown
  evidence ID, network/non-2xx hoặc provider error đều không thay đổi body,
  `mode`, citation, sanction, HTTP status hay header hiện tại; output shadow bị
  discard sau validation.
- [x] Offline runner không persist/log prompt, sanitized question, evidence
  text, provider body/refusal hay shadow output. Aggregate chỉ chứa policy,
  fixture version, stable outcome/failure counts, allowlisted model và bounded
  token usage; không chứa API key, nội dung, response ID, URL query hoặc
  exception message/stack.
- [ ] `store:false` không được claim là Zero Data Retention: abuse-monitoring
  log mặc định của provider có thể chứa prompt/response. Offline smoke chỉ dùng
  versioned technical fixture không có dữ liệu người dùng. Trước khi gửi câu
  hỏi/evidence thật của học sinh phải verify data-control trên exact OpenAI
  org/project và có product + privacy/legal approval. Personal data của trẻ
  dưới 13 tuổi hoặc dưới tuổi đồng thuận số áp dụng bị chặn nếu chưa xác minh
  Zero Data Retention.
- [ ] Direct/route AI cho người dưới 18 chỉ activate sau disclosure phù hợp độ
  tuổi, age-appropriate content filter, monitoring/reporting + high-risk
  escalation, age assurance khi phù hợp và privacy/legal review có evidence.
  Model choice phải được review lại theo current under-18 safety guidance;
  offline `gpt-5.4-mini` allowlist không tự phê duyệt production minor use.
- [x] Fixture tests dùng injected fake provider và không cần key/network, bao
  phủ flag-off, valid bundle, baseline invariance và toàn bộ fail-closed path.
  Live smoke là thao tác manual riêng với non-user technical fixture; kết quả
  chỉ là provider/config evidence, không được dùng để check retrieval,
  claim-validation, privacy/data-control, public integration hoặc direct-answer
  activation.
- [ ] AI output chỉ được trả trực tiếp cho người dùng sau khi US-025 hoàn tất
  validated bundle production + evaluation gate và US-026 hoàn tất semantic
  claim/span guard, canonical DB assembly, rate-limit/telemetry, API contract
  integration, negative/e2e tests cùng rollout review. Route shadow còn cần
  execution-lifetime seam như Cloudflare `waitUntil`; `AI_SHADOW_ENABLED` không
  bao giờ tự cấp quyền route hoặc direct response.

**Decision (2026-07-30, cập nhật 2026-07-31):** Evidence composer vẫn không
phải fallback kiến thức mở. DEC-010 đã cho phép một boundary web-search riêng,
chỉ sau retrieval no-match và chỉ trả final official citation qua URL guard;
quyết định này không nới evidence-composer gate.

**Delivery slice hiện tại:** chỉ xây adapter Responses API evidence-only và unit
tests, feature flag mặc định tắt. Không nối adapter vào `/api/chat`, không xây
retrieval/citation bundle và không thay public response contract trong lát cắt
này.

**Delivery slice kế tiếp — shadow/local activation:** chỉ nối orchestration
offline sau committed validated/reviewed technical fixture, dùng
`AI_SHADOW_ENABLED=false` mặc định và discard output. Runner không được import
vào chat/API route, không đổi câu trả lời/citation hiện tại, không persist nội
dung và không mở `ai_assisted` cho end user. Model policy chuyển khỏi
adapter-only `gpt-5.6-sol` sang exact allowlist của DEC-009 trước khi chạy live
smoke.

**Evidence:** `lib/openai-evidence.ts`, `tests/openai-evidence.test.mjs`,
`scripts/smoke-openai-evidence.mjs`, `.env.example` và
`cloudflare-env.d.ts`. PM audit chạy 13/13 test trước vòng hardening; suite cuối
cùng của Full-stack chạy 15/15 pass. Live smoke bằng fixture kỹ thuật pass với
`gpt-5.6-sol`. Story
`Partial`: chưa có retriever production, DB citation/sanction assembly,
semantic claim/span validation, rate limit/telemetry vận hành hoặc `/api/chat`
integration. Live smoke adapter đã ghi nhận trước đây không phải evidence cho
shadow orchestration hoặc direct-answer gate; các AC mới giữ unchecked.

**Evidence offline/local shadow (2026-07-31):**
`lib/ai-shadow.ts`, `fixtures/ai-shadow/cases.v1.json`,
`scripts/shadow-openai-evidence.mjs`, `tests/ai-shadow.test.mjs` và adapter
hardened trong `lib/openai-evidence.ts`. Shadow suite chạy **9/9**, adapter suite
**20/20**, combined **29/29**; full local suite **212/212**, typecheck, lint,
build và diff check pass.
Implementation dùng exact shadow flag, alias/snapshot model allowlist, bounded
case/quota, checksum-bound synthetic fixture, timeout bao trọn streamed body và
content-free aggregate; composition bị discard và `/api/chat` không đổi. Chưa
verify ZDR/MAM/under-18 hoặc production integration. Live technical smoke dùng
alias request nhưng ghi nhận actual pinned snapshot
`gpt-5.4-mini-2026-03-17`, đạt **2/2**, tổng **1.522 tokens** và không ghi
prompt/evidence/composition; đây chỉ là provider/config evidence. Story giữ
`Partial`.
