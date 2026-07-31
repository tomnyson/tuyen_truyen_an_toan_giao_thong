# Product Requirements Document — Luật Học Đường

> Trạng thái: Working draft  
> Cập nhật gần nhất: 2026-07-31
> Nguồn sự thật về tiến độ: `docs/USER_STORIES.md` và `docs/PROGRESS.md`

## 1. Bối cảnh

Luật Học Đường là cổng thông tin pháp luật dành cho học sinh. Người dùng có
thể tra cứu hoặc đặt câu hỏi về các tình huống gần gũi với đời sống học đường,
nhận câu trả lời dễ hiểu, căn cứ pháp lý và ví dụ minh họa.

Repository hiện có giao diện public, chatbot, API nội dung, khu vực quản trị,
xác thực quản trị và schema Cloudflare D1. Sprint 1B đã thêm nền tảng dữ liệu
source/provision/citation có cấu trúc, nhưng public/admin API chưa tích hợp mô
hình mới, chưa seed/backfill nội dung và workflow CMS hiện tại vẫn chỉ có hai
trạng thái. API chat vẫn trả một đoạn văn thay vì dữ liệu có cấu trúc.

## 2. Tầm nhìn và nguyên tắc sản phẩm

### 2.1 Tầm nhìn

Giúp học sinh hiểu quy định pháp luật liên quan đến mình và biết hành động an
toàn tiếp theo, mà không biến sản phẩm thành dịch vụ tư vấn pháp lý cá nhân.

### 2.2 Nguyên tắc bắt buộc

1. Sản phẩm vận hành theo mô hình RAG-first: dữ liệu đã được kiểm duyệt là
   nguồn sự thật; hệ thống phải retrieve evidence trước khi AI hỗ trợ phân tích,
   gợi ý hoặc diễn giải.
2. Mỗi câu trả lời đủ điều kiện xuất bản phải có kết luận, giải thích, căn cứ,
   ví dụ và hành động được khuyến nghị.
3. Không tạo số điều, khoản, điểm, mức phạt hoặc URL nguồn bằng suy đoán của AI.
4. Nếu không có đủ dữ liệu đã kiểm duyệt, hệ thống phải nói rõ giới hạn thay vì
   khẳng định một câu trả lời thiếu căn cứ.
5. Nội dung dùng ngôn ngữ phù hợp với học sinh, không thu thập dữ liệu cá nhân
   không cần thiết.
6. Tình huống có nguy cơ bạo lực, ảnh nhạy cảm hoặc an toàn khẩn cấp phải hướng
   người dùng dừng phát tán, lưu bằng chứng an toàn và tìm người lớn/cơ quan phù
   hợp.

## 3. Mục tiêu

- Cho phép học sinh tra cứu nhanh theo chủ đề và từ khóa.
- Trả lời câu hỏi bằng tiếng Việt dễ hiểu, có căn cứ chính thức và ví dụ minh
  họa.
- Cho phép biên tập viên quản lý, kiểm duyệt và xuất bản kho nội dung.
- Bảo đảm câu trả lời không vượt quá dữ liệu pháp luật đã được duyệt.
- Ghi nhận được nguồn, hiệu lực và lần kiểm chứng gần nhất của mỗi căn cứ.
- Có đủ kiểm thử và kiểm soát vận hành để backend có thể triển khai production.

## 4. Chỉ số thành công đề xuất

Các ngưỡng dưới đây là initial proposed targets, phải được PM + internal content
reviewer duyệt trước production và được xác nhận/recalibrate bằng decision record
sau khi có dữ liệu sử dụng thật:

- 100% câu trả lời ở chế độ kiến thức có ít nhất một dẫn chứng đã kiểm duyệt.
- 100% dẫn chứng hiển thị được văn bản, điều/khoản/điểm nếu có, URL nguồn chính
  thức và ngày kiểm chứng gần nhất.
- 0 citation hoặc mức phạt do model tự tạo ngoài dữ liệu truy xuất.
- Tối thiểu 90% câu hỏi thuộc ba chủ đề MVP nhận được kết quả hữu ích từ kho dữ
  liệu, không cần AI kiến thức mở.
- P95 thời gian phản hồi của tra cứu kho nội dung dưới 2 giây; P95 của nhánh có
  AI dưới 10 giây, không tính sự cố nhà cung cấp.
- 100% nội dung public đã đi qua trạng thái duyệt và có người duyệt.

## 5. Personas

### Học sinh

- Muốn biết hành vi có vi phạm hay không và nên làm gì.
- Cần câu trả lời ngắn, dễ hiểu, có ví dụ gần với trường học.
- Không được kỳ vọng hiểu thuật ngữ pháp lý hoặc cấu trúc văn bản quy phạm.

### Phụ huynh/giáo viên

- Muốn có nội dung tham khảo để giải thích cho học sinh.
- Cần nhìn thấy nguồn chính thức và lưu ý về độ tuổi/phạm vi áp dụng.

### Biên tập viên nội dung

- Tạo và sửa câu trả lời, ví dụ, nguồn và căn cứ.
- Chuẩn bị bản nháp, gửi duyệt và theo dõi lịch sử thay đổi.

### Người duyệt nội dung nội bộ

- Xác nhận căn cứ, hiệu lực, cách diễn giải và ví dụ trước khi xuất bản.
- Cần biết ai sửa, sửa gì, khi nào và nguồn nào đã được kiểm chứng.
- Không bắt buộc là luật sư; chịu trách nhiệm kiểm tra mapping điều/khoản, hiệu
  lực, diễn giải và source allowlist trước khi duyệt.

### Quản trị hệ thống

- Quản lý quyền truy cập, cấu hình môi trường, giám sát lỗi và chống lạm dụng.

## 6. Phạm vi MVP

### Chủ đề

- Giao thông.
- Mạng xã hội.
- Sở hữu trí tuệ.

### Trải nghiệm người dùng

- Tra cứu theo từ khóa tiếng Việt có/không dấu.
- Lọc theo chủ đề.
- Xem kết quả gồm kết luận/hành vi, giải thích, căn cứ, mức xử lý tham khảo,
  ví dụ và việc nên làm.
- Mở nguồn chính thức tương ứng với từng căn cứ.
- Hỏi chatbot; hệ thống ưu tiên kho nội dung được duyệt.
- Nhận thông báo rõ ràng khi câu hỏi nằm ngoài phạm vi dữ liệu.

### Quản trị và backend

- Xác thực người dùng nội bộ.
- CRUD nội dung pháp luật, nguồn, căn cứ và ví dụ.
- Workflow `draft → pending_review → published → archived`.
- Chỉ nội dung `published` còn hiệu lực mới xuất hiện công khai.
- API trả lời có cấu trúc và gắn dẫn chứng từ database.
- Pipeline nhập dữ liệu ngoài chỉ tạo candidate ở staging/draft, giữ provenance
  và bắt buộc qua quy trình bốn mắt trước khi vào corpus RAG.
- Lưu người tạo, người duyệt, thời điểm duyệt, phiên bản và lịch sử thay đổi.
- Rate limit tối thiểu cho login và chat.
- Test end-to-end cho publish và trả lời có dẫn chứng.

## 7. Ngoài phạm vi MVP

- Tư vấn pháp lý cá nhân hoặc đánh giá kết quả xử phạt cho vụ việc cụ thể.
- Tài khoản và hồ sơ cá nhân dành cho học sinh.
- Thu thập họ tên, trường, địa chỉ, số điện thoại hoặc dữ liệu nhạy cảm.
- AI tự crawl và tự xuất bản văn bản pháp luật; AI chỉ được hỗ trợ discovery,
  trích xuất và gợi ý bản nháp có kiểm soát.
- Vector database khi tập dữ liệu còn nhỏ và structured search/FTS đáp ứng được;
  RAG MVP không đồng nghĩa bắt buộc có vector database.
- Đa tác tử trong runtime sản phẩm.
- Hỗ trợ toàn bộ lĩnh vực pháp luật ngay trong phiên bản đầu.
- Thay thế luật sư, cơ quan nhà nước hoặc văn bản pháp luật chính thức.

## 8. Luồng nghiệp vụ mục tiêu

### 8.1 Hỏi đáp

1. Nhận và chuẩn hóa câu hỏi.
2. Loại bỏ message không hợp lệ; giới hạn số lượng và độ dài.
3. Xác định chủ đề và ý định.
4. Truy xuất câu trả lời, căn cứ, nguồn và ví dụ đã xuất bản.
5. Nếu độ tin cậy không đạt ngưỡng, trả trạng thái `unavailable`.
6. Nếu có đủ dữ liệu, AI có thể diễn giải trong phạm vi dữ liệu truy xuất.
7. Backend kiểm tra output và gắn citation từ record nội bộ, không lấy citation
   do model tự sinh.
8. Trả response có cấu trúc để frontend render từng phần.

### 8.2 Biên tập và xuất bản

1. Biên tập viên tạo hoặc cập nhật bản nháp.
2. Hệ thống kiểm tra trường bắt buộc, URL HTTPS và liên kết đến căn cứ.
3. Biên tập viên gửi duyệt.
4. Người duyệt nội dung nội bộ kiểm tra source allowlist, mapping điều/khoản,
   hiệu lực, diễn giải và ví dụ.
5. Người duyệt xuất bản hoặc trả lại kèm lý do.
6. Hệ thống lưu phiên bản và audit log.
7. Nội dung đã xuất bản được đưa vào tra cứu/chat.
8. Nội dung hết hiệu lực được cập nhật, thay thế hoặc lưu trữ.

## 9. Functional requirements

### FR-01 — Tra cứu và lọc

- Tìm trên tiêu đề, chủ đề, tags, căn cứ và các từ khóa đồng nghĩa đã quản lý.
- Hỗ trợ tiếng Việt có/không dấu.
- Có trạng thái không tìm thấy và cách quay lại toàn bộ kết quả.
- Public catalog phải có stable content key và một resolver duy nhất; managed
  published có thể override static cùng key nhưng không được nối hai bản thành
  duplicate.
- Repository phân biệt `available_records`, `available_empty` và `unavailable`.
  Query thành công nhưng không có managed record vẫn dùng static baseline đã
  trừ reviewed suppression và là trạng thái ready; chỉ dependency unavailable
  mới là degraded fallback.
- Degraded public content trả HTTP 200 có `dataState=degraded`,
  `resolverPolicyVersion`, danh sách đã lọc và `Cache-Control: no-store`; không
  làm content đã archive/suppress xuất hiện lại.
- Content từng published/keyed không hard-delete hoặc tái sử dụng key.
  Archive/suppression phải là tombstone durable, qua review/audit và áp dụng cả
  khi fallback.

### FR-02 — Chi tiết câu trả lời

Mỗi kết quả phải hiển thị:

- Kết luận ngắn.
- Giải thích dễ hiểu.
- Mức xử lý chỉ khi có dữ liệu được duyệt.
- Một hoặc nhiều căn cứ.
- Ít nhất một ví dụ/tình huống.
- Hành động an toàn hoặc cách khắc phục.
- Cảnh báo về độ tuổi, chủ thể, thời điểm hiệu lực hoặc giới hạn áp dụng khi phù
  hợp.

### FR-03 — Dẫn chứng và nguồn

- Căn cứ phải liên kết đến một source record.
- Source record có số hiệu, tên, URL chính thức, ngày ban hành, ngày hiệu lực,
  ngày hết hiệu lực nếu có, trạng thái và `last_verified_at`.
- `official_url` chỉ được publish khi thuộc `vbpl.vn`, `vbpl.moj.gov.vn` hoặc
  `chinhphu.vn`/subdomain chính thức; nguồn ngoài allowlist bị từ chối.
- URL phải dùng HTTPS và authority phải khớp `official_host`; không chấp nhận
  domain allowlist chỉ xuất hiện trong path, query hoặc fragment.
- Provision record có điều, khoản, điểm và phần trích/diễn giải đã được duyệt.
- Frontend mở được URL chính thức từ từng citation.
- Không xuất bản câu trả lời không có căn cứ, trừ nội dung hướng dẫn an toàn
  không đưa ra kết luận pháp lý; trường hợp này phải có nhãn rõ ràng.

### FR-04 — Chatbot

- Nhận tối đa 8 message gần nhất, tối đa 600 ký tự/message trong MVP hiện tại.
- Ưu tiên nội dung đã xuất bản trước nhánh AI.
- Phân biệt rõ `curated`, `ai_assisted` và `unavailable`.
- Intent ảnh riêng tư/nhạy cảm phải ưu tiên safety guidance; intent bản quyền
  chỉ match dấu hiệu tác giả/tác phẩm/giấy phép/ghi nguồn. Từ chung “hình ảnh”
  hoặc câu mơ hồ không được tự chọn một nhánh.
- Response mục tiêu dùng contract canonical tại
  `docs/TECHNICAL_SPEC.md#6-api-contract-đích`. Shape cấp cao:

```ts
type LegalAnswerResponse = {
  requestId: string;
  mode: "curated" | "ai_assisted" | "unavailable";
  confidence: "high" | "medium" | "low";
  answer: {
    conclusion: string;
    explanation: string;
    examples: Array<{
      title: string;
      scenario: string;
      outcome: string;
    }>;
    recommendedActions: string[];
    warnings: string[];
  };
  sanctions: Array<{
    sanctionId: number;
    provisionId: number;
    measureType: "fine" | "warning" | "remedy" | "other";
    summary: string;
    amountMin?: number;
    amountMax?: number;
    currency?: string;
    applicabilityConditions: string[];
  }>;
  citations: Array<{
    sourceId: number;
    provisionId: number;
    documentNumber: string;
    documentTitle: string;
    provision: string;
    officialUrl: string;
    effectiveFrom?: string;
    lastVerifiedAt: string;
  }>;
};
```

- Nếu AI được dùng, prompt chỉ chứa dữ liệu truy xuất cần thiết.
- Backend phải loại bỏ hoặc từ chối citation/mức tiền không nằm trong record đã
  truy xuất.

### FR-05 — CMS

- Quản lý câu trả lời, ví dụ, nguồn và điều/khoản/điểm.
- Showcase public render toàn bộ record published đủ title/topic/summary/source,
  có detail accessible; không cố định hai vị trí hoặc dựng fallback thiếu dữ
  liệu bắt buộc.
- Kiểm tra độ dài, trường bắt buộc, topic/status hợp lệ và URL HTTPS.
- Có tìm kiếm, phân trang và bộ lọc trạng thái khi dữ liệu tăng.
- Không xóa cứng nội dung đã từng xuất bản nếu cần giữ audit; ưu tiên archive.

### FR-06 — Workflow và quyền

- Tách vai trò `editor`, `reviewer`, `admin`.
- Editor không tự duyệt nội dung do chính mình tạo nếu quy trình yêu cầu bốn
  mắt.
- Mọi thay đổi trạng thái phải lưu người thực hiện, thời điểm và ghi chú.
- Nội dung `draft`, `pending_review`, `archived` không được trả qua public API.

### FR-07 — Quản lý hiệu lực

- Có tác vụ định kỳ xác định source sắp hoặc đã hết hiệu lực.
- Nội dung phụ thuộc source hết hiệu lực phải được đánh dấu để duyệt lại.
- Footer “cập nhật nội dung” phải lấy từ dữ liệu, không hard-code.

### FR-08 — Logging và quan sát

- Ghi mode trả lời, ID record truy xuất, citation ID, latency và lỗi provider.
- Record/citation ID trong log phải đến từ structured retrieval metadata và
  khớp canonical response/evidence; không suy ID từ answer text.
- Không log nguyên văn dữ liệu cá nhân không cần thiết.
- Có correlation ID để truy vết request.

### FR-09 — Nhập dữ liệu ngoài có kiểm soát

- Production ingestion chỉ chạy với source registry durable đạt `green`, có
  terms/retention và hai approval độc lập; nguồn `yellow` chỉ dùng cho
  local/manual feasibility spike.
- Ưu tiên API/export chính thức; nếu chưa có API, connector HTML/PDF chỉ được
  fetch từ host allowlist và phải tuân thủ điều khoản/attribution.
- Lưu provenance, canonical URL, external ID, thời điểm fetch, checksum,
  version và raw snapshot reference.
- Import phải idempotent, có quarantine/retry và không auto-publish.
- Queue/retry phải chịu được at-least-once delivery và crash-resume mà không tạo
  raw/candidate/audit trùng hoặc bỏ qua bước review.
- Upstream update/supersede/delete phải tạo revision/tombstone, invalidate graph
  phụ thuộc và đưa về review; không hard-delete canonical content đang được
  trích dẫn.
- AI chỉ trích xuất, phân loại hoặc gợi ý candidate; editor và reviewer khác
  nhau phải duyệt trước khi record vào corpus.

### FR-10 — Retrieval-Augmented Generation

- Retrieval chỉ dùng source/provision/answer đã `published`, còn hiệu lực và
  đạt freshness policy.
- MVP dùng structured filter, alias và D1 FTS5; embedding/vector chỉ thêm sau
  đánh giá định lượng.
- AI composer chỉ nhận sanitized question và evidence bundle.
- Model chỉ tham chiếu evidence IDs; server gắn citation và mức xử lý từ
  database.
- Mỗi factual claim phải map tới evidence span/predicate; numeric/date/article
  fields phải exact-match canonical record.
- Không đủ evidence, provider lỗi hoặc output invalid phải fail closed.
- Shadow AI chỉ được gọi server-side khi `AI_SHADOW_ENABLED=true` và
  `OPENAI_API_KEY` hiện có khả dụng; biến thiếu hoặc mọi giá trị khác `true`
  đều là disabled. Provider request bắt buộc `store:false`, không bật web
  search/tool và chỉ nhận evidence bundle đã validate/review.
- Shadow output không được thay đổi body, mode, citation, sanction, status hoặc
  header của câu trả lời hiện tại; không persist prompt/output. Missing key,
  missing/invalid evidence, timeout, schema/refusal/provider error chỉ tạo
  outcome kỹ thuật đã redact và giữ nguyên baseline response.
- Fixture test dùng provider giả lập và live smoke thủ công bằng fixture kỹ
  thuật là hai loại evidence riêng. Live smoke chỉ chứng minh credential,
  network và provider schema, không chứng minh corpus/retrieval an toàn hoặc
  quyền trả AI output cho người dùng.
- `ai_assisted` chỉ được phép ảnh hưởng response sau khi US-025 tạo validated
  evidence bundle từ graph production và US-026 hoàn tất claim/span validation,
  DB citation/sanction assembly, negative tests, evaluation gate và rollout
  review riêng.

## 10. Non-functional requirements

### NFR-01 — An toàn nội dung

- Fail closed khi không có dữ liệu hoặc provider lỗi.
- Không khẳng định là tư vấn pháp lý.
- Có hướng dẫn khẩn cấp phù hợp với tình huống rủi ro.

### NFR-02 — Bảo mật

- Secret chỉ tồn tại server-side; không commit vào repository.
- Mật khẩu phải lưu dạng hash có salt, không lưu plaintext.
- Cookie quản trị `HttpOnly`, `SameSite=Strict`, `Secure` trên HTTPS và có thời
  hạn.
- Kiểm tra same-origin/CSRF cho mutation.
- Rate limit login/chat; có cơ chế chống thử mật khẩu.
- Phân quyền ở backend, không chỉ ẩn UI.

### NFR-03 — Hiệu năng và khả dụng

- Public page vẫn hiển thị thông báo có kiểm soát khi database hoặc AI lỗi.
- Query có index phù hợp và pagination.
- Timeout provider AI hữu hạn; có fallback an toàn.

### NFR-04 — Khả năng bảo trì

- Một nền tảng deploy chính được xác định và tài liệu hóa.
- Schema thay đổi qua migration có version.
- `.env.example`, README và code dùng cùng một bộ biến môi trường.
- Business logic truy xuất/kiểm duyệt tách khỏi UI và route handler.

### NFR-05 — Kiểm thử

- Unit test cho normalization, ranking, validation, auth và output guard.
- Integration test với D1 cho CRUD và trạng thái xuất bản.
- E2E test cho `draft → review → publish → public/chat`.
- Contract test cho response có cấu trúc và citation.
- Accessibility smoke test cho search, modal và chat.

## 11. Acceptance criteria cấp sản phẩm

- [ ] Một học sinh hỏi câu thuộc phạm vi và nhận đủ kết luận, giải thích, ví dụ,
  hành động và ít nhất một link nguồn chính thức.
- [ ] Mọi citation trong response ánh xạ tới source/provision record đã xuất bản.
- [ ] Khi không có nguồn đủ tin cậy, response là `unavailable` và không tạo căn
  cứ/mức phạt.
- [ ] Biên tập viên có thể tạo bản nháp và gửi duyệt; reviewer có thể xuất bản
  hoặc trả lại.
- [ ] Draft, pending review và archived không xuất hiện ở public API/chat.
- [ ] Lịch sử thay đổi và người duyệt truy xuất được.
- [ ] Source hết hiệu lực kích hoạt trạng thái cần kiểm tra lại.
- [ ] Login/chat có rate limit; mật khẩu không được lưu plaintext.
- [ ] Luồng chính có test tự động chạy trong CI.
- [ ] Tài liệu môi trường và nền tảng deploy khớp implementation.

## 12. Hiện trạng so với mục tiêu

### Đã có bằng chứng trong code

- Trang public, bộ lọc topic và tìm kiếm không dấu.
- Bốn điều luật nền còn được phép hiển thị thuộc hai nhóm nội dung thực tế, có
  căn cứ dạng text và case study; hai mục bản quyền dẫn văn bản hết hiệu lực đã
  được tạm loại khỏi read path.
- Danh sách hai URL nguồn chính thức còn được phép hiển thị.
- Chat kiểm tra message, ưu tiên dữ liệu quản trị đã publish rồi dữ liệu nền;
  câu không match trả `unavailable` và không còn gọi provider AI khi chưa có
  evidence bundle.
- CMS CRUD cho `legal_entries` và `showcases`, trạng thái `draft/published`.
- Cookie session ký HMAC, hết hạn sau 8 giờ, kiểm tra origin cho mutation.
- Public API chỉ lấy record `published`.
- Render/auth/chat regression suite hiện chạy 15/15 pass.
- Sprint 1B có schema/migration cho `legal_sources`, `legal_provisions`,
  `legal_entry_citations`; migration 0002 bổ sung reviewed answer-citation
  bridge, provision revision/checksum/effectivity, canonical checksum verifier,
  invalidation và 17 schema tests đã chạy pass, 0 skip.
- Migration 0003 bổ sung sidecar identity-neutral cho principal/role,
  subject/revision, review request/decision và audit bất biến. Editorial suite
  13/13 và full suite 76/76 đã chạy pass; final review không còn
  blocker/high/medium trong phạm vi sidecar.

### Còn thiếu hoặc chưa hoàn chỉnh

- Citation đã có schema foundation nhưng public/admin API chưa đọc/ghi mô hình
  này; người dùng chưa thấy URL chính thức theo từng câu trả lời.
- Chat response chưa có cấu trúc và không bảo đảm mọi câu trả lời có ví dụ.
- Chưa có ingestion connector, raw staging/quarantine, FTS5 index hoặc vòng đời
  re-index.
- Đã có AI composer adapter cô lập với strict evidence/four-eyes/freshness
  gate và contract tests, nhưng chưa có retriever production, DB citation
  assembly, semantic claim-span validation hoặc production rate-limit/telemetry
  verification; chưa có `/api/chat` integration. API key không làm chat dùng
  kiến thức mở.
- Đã có candidate retriever foundation cô lập: join relational graph, kiểm
  policy/effectivity/four-eyes/checksum và deterministic lexical top-k. Một
  reviewed migration fixture tạo được internal candidate; corpus legacy vẫn
  unverified và không có record production nào được tự nâng thành validated RAG
  evidence. Chưa có FTS5 hoặc chat integration.
- Sidecar đã có database four-eyes, revision và audit cho workflow cô lập, nhưng
  CMS chưa có authenticated actor/session, reviewer API, history UI, archive
  hoặc graph-promotion transaction.
- Showcase public chỉ dùng tiêu đề của hai record đầu tiên.
- Đã có local-safe `rate-limit-v1` cho login/chat với D1 atomic state, HMAC
  identity và fail-closed route guards. Production vẫn chưa được bật vì thiếu
  migration-before-code, Cloudflare header/concurrency smoke, telemetry và
  threshold/retention approval. Pagination, CI và D1 production E2E vẫn thiếu.
- Auth một admin hiện dùng `ADMIN_PASSWORD_HASH` với PBKDF2-HMAC-SHA256, salt
  ngẫu nhiên và format versioned; plaintext `ADMIN_PASSWORD` bị bỏ qua. Runtime
  fail closed khi thiếu/sai cấu hình, có script tạo hash và runbook xoay
  credential/session. Benchmark 600.000 vòng trên Worker production-like vẫn là
  rollout gate, không phải lý do quay lại plaintext.
- Cloudflare Worker + D1 đã được chốt là production primary và migration runbook
  đã có. Production rollout vẫn **BLOCKED** vì Sites `project_id` hiện không
  resolve được và hành vi control plane áp migration trước activation chưa được
  xác minh.

### Production blocker đã được giảm thiểu, chưa đóng — CR-001

Hai mục bản quyền trước đây dẫn Nghị định 131/2013/NĐ-CP. CSDL quốc gia về văn
bản pháp luật xác nhận [Nghị định 131/2013/NĐ-CP hết hiệu lực toàn bộ từ
15/02/2026](https://vbpl.vn/TW/Pages/vbpq-thuoctinh.aspx?ItemID=32506). Văn bản
thay thế đã được công bố, nhưng project chưa có mapping điều/khoản/mức phạt mới
được người duyệt nội dung nội bộ xác nhận.

Sprint 1A đã tạm loại hai mục “Sao chép tác phẩm trái phép, đạo văn” và “Cố ý
vô hiệu biện pháp bảo vệ phần mềm” khỏi dữ liệu hard-code, source list,
public/retrieval và chat context. Managed public/retrieval có deny-list cho căn
cứ Nghị định 131 bằng matcher chuẩn hóa để nhận diện các biến thể khoảng
trắng/dấu câu phổ biến; câu không có evidence trả `unavailable`, không gọi
provider AI. Admin `POST`/`PATCH` cũng từ chối riêng record có
`status=published` khi `legalBasis` match deny-list này. Đây là mitigation, chưa
phải final fix: schema source/provision đã có invariant publish và invalidation,
nhưng retrieval chưa tích hợp mô hình này, chưa có mapping mới được duyệt và
chưa có D1 production integration evidence.

Regression cho homepage, auth, chat copyright, no-provider và admin từ chối
publish Nghị định 131 đã chạy 15/15 pass. Test vẫn chưa seed D1 record bị chặn
hoặc xác minh `/api/content`/managed retrieval production end-to-end. Đội phát
triển không tự suy ra điều khoản thay thế.

### Sprint 1B/1D local foundation và production gate

Migration expand-only `0001_citation_foundation`,
`0002_reviewed_rag_bridge`, `0003_editorial_trust_primitives` và
`docs/MIGRATION_RUNBOOK.md` đã được tạo, không chứa seed hoặc mapping Nghị định
341/2025/NĐ-CP.
`tests/schema-foundation.test.mjs` chạy 17/17 pass, bao phủ schema graph,
allowlist/URL authority, four-eyes, immutable creator/revision, checksum
metadata, exact citation binding và invalidation.
`tests/editorial-workflow-schema.test.mjs` chạy 13/13 pass, bao phủ role trust,
state/revision guards, independent reviewer, atomic audit và immutable history.

Đây là local verification, không phải production execution. Build, typecheck,
lint và rendered suite đã pass. Sites control plane chưa resolve được exact
`project_id`, chưa chứng minh migration apply đúng một lần và trước application
activation; do đó production deployment vẫn bị chặn.

## 13. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| Căn cứ hoặc mức phạt sai/hết hiệu lực | Cao | Reviewer chuyên môn, source/provision riêng, ngày hiệu lực, kiểm chứng định kỳ |
| AI tạo citation hợp lý nhưng không có thật | Cao | Citation chỉ sinh từ DB; output guard; fail closed |
| Diễn giải làm mất ngoại lệ pháp lý | Cao | Lưu warning/phạm vi áp dụng; template câu trả lời; review bắt buộc |
| Học sinh chia sẻ dữ liệu nhạy cảm | Cao | Không yêu cầu PII, nhắc nhở trên UI, redaction/log minimization |
| Tài khoản admin bị dò mật khẩu | Cao | Password hash, rate limit, lockout/backoff, MFA nếu khả thi |
| Draft vô tình public | Cao | Filter backend, test trạng thái, RBAC |
| Hai nền tảng deploy tạo hành vi khác nhau | Trung bình/Cao | Chốt một nền tảng primary và kiểm thử đúng runtime |
| Dữ liệu hard-code và CMS trùng nhau | Trung bình | Migrate seed vào DB, stable IDs/deduplication |
| Keyword sai ý định, ví dụ “hình ảnh” | Trung bình | Taxonomy/intent rõ, test regression cho riêng tư và bản quyền |

## 14. Giả định

- MVP chỉ phục vụ nội dung pháp luật Việt Nam và giao diện tiếng Việt.
- Có ít nhất một người duyệt nội dung nội bộ chịu trách nhiệm kiểm tra mapping,
  hiệu lực và diễn giải trước production; không bắt buộc là luật sư.
- Cloudflare Worker + D1 là runtime và datastore production chính.
- Kho dữ liệu MVP đủ nhỏ để tìm kiếm có cấu trúc trước khi cần vector database.
- Các mức phạt trong repository chưa được coi là đã tái kiểm chứng tại ngày cập
  nhật PRD này.

## 15. Decision Log

| Ngày | ID | Quyết định | Hệ quả |
|---|---|---|---|
| 2026-07-29 | DEC-001 | Cloudflare Worker + D1 là production primary. | Không giả định Vercel có feature parity; runbook, migration và smoke test production phải ưu tiên Cloudflare. |
| 2026-07-29 | DEC-002 | Câu hỏi ngoài kho đã duyệt phải trả `unavailable`; AI chỉ được diễn giải evidence đã truy xuất. | Không dùng AI kiến thức mở; backend không được gửi câu hỏi ngoài retrieval sang provider để tạo câu trả lời pháp lý. |
| 2026-07-29 | DEC-003 | Bắt buộc quy trình bốn mắt `editor != reviewer`. | Backend phải tách vai trò và chặn người tạo tự duyệt/xuất bản nội dung của mình. |
| 2026-07-29 | DEC-004 | Chỉ publish nguồn Chính phủ thuộc allowlist mặc định: `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` và subdomain chính thức. | Nguồn ngoài allowlist bị từ chối; reviewer là người duyệt nội dung nội bộ, không bắt buộc là external legal reviewer. |
| 2026-07-30 | DEC-005 | Sản phẩm là RAG-first; MVP retrieve corpus đã reviewed/published/effective trước khi dùng model compose và không bắt buộc vector database. | Structured search/alias/FTS5 là baseline; không có evidence hợp lệ thì trả `unavailable`. |
| 2026-07-30 | DEC-006 | Dữ liệu ngoài chỉ được ingest vào staging/draft có provenance và qua bốn mắt; AI không auto-publish hoặc làm nguồn xác minh. | API key chỉ dùng cho discovery/extraction draft hoặc evidence-bound composer; end-user query không live-search và không dùng kiến thức mở làm fallback. |
| 2026-07-31 | DEC-007 | Credential admin chỉ lưu dạng hash versioned `PBKDF2-HMAC-SHA256`, không hỗ trợ plaintext. | Cấu hình thiếu/malformed fail closed; rotation đổi cả password hash và session secret; benchmark Worker là rollout gate. |
| 2026-07-31 | DEC-008 | Catalog phân biệt managed success-empty với dependency unavailable; static baseline là normal overlay, còn unavailable dùng degraded fallback. | Degraded trả HTTP 200 + `dataState=degraded` + no-store; reviewed suppression áp dụng cả fallback, managed-only key hợp lệ không phải orphan và local slice không đóng production migration gate. |
| 2026-07-31 | DEC-009 | AI request-path đầu tiên chỉ chạy shadow, dùng `AI_SHADOW_ENABLED=false` mặc định và `OPENAI_API_KEY` server-only hiện có. | Chỉ validated evidence được gửi với `store:false`, không web/tool; output không đổi response/citation và không persist. Direct `ai_assisted` cần gate US-025/US-026 riêng. |

## 16. Open questions cần chủ dự án xác nhận

1. Có lưu câu hỏi ẩn danh để đo coverage không; nếu có, lưu bao lâu và áp dụng
   quy tắc redaction nào?
2. PM và internal content reviewer sẽ duyệt freshness policy nào cho từng loại
   nguồn; trước khi có policy, source bị loại khỏi RAG.
3. MVP cần mô hình applicability theo độ tuổi/chủ thể chi tiết đến mức nào trước
   khi hiển thị sanction?
4. Provider T3 cụ thể là đơn vị nào; API/export docs, sample, auth, quota,
   terms/license và update/delete semantics ở đâu?
5. Retention cho immutable raw snapshots theo terms của từng nguồn là bao lâu?
6. Ngân sách, model allowlist và quota AI production do ai sở hữu?
7. Có duyệt **PROP-001**: giữ public/admin/query trong Next/Vinext Worker và
   tách scheduled/batch ingestion thành Worker riêng có R2/Queue/source
   credentials không?

## 17. Tài liệu liên quan

- `docs/USER_STORIES.md`: backlog và acceptance criteria có checkbox.
- `docs/PROGRESS.md`: trạng thái, owner và bằng chứng.
- `docs/THIRD_PARTY_DATA_ASSESSMENT.md`: đánh giá nguồn ngoài, ingestion và env
  cho RAG.
- `README.md`: hướng dẫn chạy repository hiện tại.
- `lib/legal-content.ts`: dữ liệu pháp luật nền hiện tại.
- `lib/legal-chat.ts`: rule và retrieval prototype hiện tại.
- `app/api/chat/route.ts`: orchestration chat hiện tại.
- `app/admin/api/content/route.ts`: CRUD prototype hiện tại.
- `db/schema.ts`: schema D1 hiện tại.
