# Thiết kế: Chatbot thông minh hơn (grounded library answer)

Ngày: 2026-09-07. Trạng thái: đã duyệt qua brainstorming.

## Vấn đề

Toàn bộ khâu hiểu câu hỏi của chat hiện là đếm từ trùng nhau
(`scoreSituationMatch`) cộng vài `includes()` viết cứng trong
`findCuratedAnswer`. Hệ quả:

- Câu hỏi diễn đạt tự do trượt ngưỡng và rơi thẳng xuống
  "chưa có trong dữ liệu" dù kho có câu trả lời. "Bị bạn cùng lớp quay
  clip rồi tung lên nhóm" không trùng chữ nào với "phát tán hình ảnh".
- Không có ngữ cảnh nhiều lượt. 8 tin nhắn cũ được gửi lên nhưng chỉ tin
  cuối được dùng, nên "vậy phạt bao nhiêu?" là một câu hỏi vô nghĩa.
- Căn cứ pháp lý gắn cứng theo entry, không bám theo nội dung trả lời.
- Ngưỡng `minimumManagedScore = 2` vừa dễ cho câu sai lọt vào, vừa chặt
  cho câu đúng diễn đạt khác.

## Mục tiêu

Bốn mục tiêu chủ dự án chốt, theo thứ tự không loại trừ nhau: trả lời
được nhiều câu hơn, hiểu ngữ cảnh nhiều lượt, câu trả lời sâu và cá nhân
hơn, chính xác và an toàn hơn.

## Ràng buộc

- Một lần gọi LLM cho mỗi câu hỏi, mục tiêu dưới 3 giây.
- LLM được viết lại câu trả lời nhưng **chỉ từ dữ liệu đã duyệt bốn
  mắt**; không được sinh nội dung pháp lý mới (DEC-002).
- Không thêm vector database (DEC-005).
- Khi thiếu thông tin thì trả lời phần chắc chắn kèm điều kiện và gợi ý
  hỏi tiếp, không chặn người dùng bằng câu hỏi ngược.

## Tài sản đã có, chưa nối vào chat

`lib/openai-evidence.ts` đã có `composeEvidenceAnswer()` hoàn chỉnh và
được test kỹ:

- JSON Schema ép `evidenceIds` vào enum của đúng những evidence được
  đưa vào lần gọi đó, nên model không trích ra ngoài được.
- Khai báo câu hỏi và evidence là dữ liệu không đáng tin cậy, chống
  prompt injection.
- **Từ chối mọi prose chứa chữ số** (`NUMERIC_MISMATCH`). Số tiền,
  điều/khoản/điểm, ngày, độ tuổi do server dựng từ dữ liệu chuẩn.
- `store: false`, model pin, timeout, đếm token.

Nó chỉ chạy offline qua `lib/ai-shadow.ts` với fixture kỹ thuật, theo
DEC-009. Việc cần làm là xây khâu lấy evidence cho câu hỏi thật và tháo
chốt có kiểm soát, không phải viết lại bộ soạn.

## Hướng đã chọn

**Composer kiêm luôn việc chọn evidence.** Lọc thô bằng thuật toán để
lấy tối đa 8 ứng viên (ưu tiên recall), đưa cả 8 vào cùng một lần gọi đã
phải trả tiền, để model vừa chọn evidence nào thật sự trả lời được, vừa
viết phần diễn giải.

Hai hướng bị loại: chỉ nâng retrieval thuật toán (không đạt mục tiêu ngữ
cảnh và recall ngữ nghĩa); thêm vector index (trái DEC-005, và với kho
hiện tại một shortlist 8 gần như luôn chứa câu trả lời đúng).

`MAX_EVIDENCE_ITEMS = 8` là hằng số chốt cứng trong composer, nên
shortlist là 8 chứ không phải con số tuỳ chọn.

## Kiến trúc

Nhánh mới nằm trước mọi fallback hiện có và rơi xuống đúng hành vi hôm
nay khi có bất kỳ trục trặc nào.

```
sanitizeMessages → chặn ý định ảnh            (giữ nguyên)
  ↓
buildChatContext(messages)          [mới]  gộp đa lượt → câu hỏi đầy đủ
  ↓
shortlistEvidence(context)          [mới]  kho đã duyệt → ≤8 EvidenceRecord
  ↓  rỗng ─────────────────────────────────┐
composeEvidenceAnswer(...)          [có sẵn] 1 lần gọi: chọn + viết
  ↓  thất bại (bất kỳ mã lỗi nào) ─────────┤
renderGroundedAnswer()              [mới]  server dựng số/căn cứ         │
  ↓                                        ↓
answerOrigin: "grounded_library"     cascade cũ nguyên vẹn:
                                     findManagedAnswer → findCuratedAnswer
                                     → reviewed_web → live_web
                                     → reference → unavailable
```

Bot không bao giờ tệ hơn hiện tại; tệ nhất là bằng hiện tại.

### Module

| File | Việc | Phụ thuộc |
|---|---|---|
| `lib/chat-evidence-policy.ts` (mới) | Hằng số + vị từ tươi mới của evidence | không |
| `lib/chat-context.ts` (mới) | Lịch sử → `ChatContext`. Thuần, không I/O | `situation-search` |
| `lib/evidence-shortlist.ts` (mới) | Kho đã duyệt → `EvidenceRecord[]`. Nơi **duy nhất** quyết định cái gì được đưa cho model | `@/db`, `openai-evidence` |
| `lib/grounded-answer.ts` (mới) | Gọi composer, dựng `ChatAnswerSection[]`, chèn số/căn cứ chuẩn | `openai-evidence`, `chat-answer-presentation` |
| `app/api/chat/route.ts` | Thêm một dependency injectable | — |

`lib/legal-chat.ts`, `lib/knowledge-router.ts`, `lib/legal-evidence-retriever.ts`
**không đổi**. Cái thứ ba đã 1331 dòng và phục vụ candidate graph của
web-search; bồi thêm vào đó là làm hỏng cả hai mục đích.

## Evidence

Composer đòi rất ngặt qua `validateEvidenceRequest`. Schema hiện tại đã
đủ cột, không cần migration.

| Trường composer đòi | Lấy từ |
|---|---|
| `provisionCreatedBy` ≠ `provisionReviewedBy` | `legal_provisions.created_by` / `reviewed_by` |
| `sourceCreatedBy` ≠ `sourceVerifiedBy` | `legal_sources.created_by` / `verified_by` |
| `provisionStatus: "published"`, `sourceStatus: "in_force"` | điều kiện WHERE, y hệt `fetchVerifiedEntryCitations` |
| `text` (≤4000) | `legal_provisions.simplified_text` |
| `allowedClaims` (≤16) | `entry.title`, `penalty`, `remedy`, `caseStudy` |
| `evidenceId` | `e<entryId>-p<provisionId>` |

Ràng buộc "người tạo ≠ người duyệt" của composer tự loại mọi bản ghi
chưa thật sự bốn mắt. Không có evidence hợp lệ thì không gọi model.

Dấu thời gian trong DB là `text` và có thể ở dạng chỉ ngày; shortlist
chuẩn hoá sang ISO datetime (`YYYY-MM-DDT00:00:00Z`), bản ghi không
chuẩn hoá được thì bị loại thay vì gửi lên và nhận `INVALID_EVIDENCE`.

### Tươi mới

`lib/chat-evidence-policy.ts`, phiên bản `chat-evidence-freshness-v1`:
nguồn `in_force`; `last_verified_at` trong vòng N ngày (mặc định 365,
đọc từ env có chặn biên); `effective_from` ≤ hôm nay; `effective_to`
rỗng hoặc còn hạn; `effectivity_status ∈ {in_force, partially_in_force}`;
checksum trích dẫn khớp checksum điều khoản.

Cố ý không dùng `FreshnessPolicy` của `legal-evidence-retriever.ts`:
policy đó là dữ liệu được inject, hiện chỉ tồn tại trong seed/test, chưa
có đường dây production. Kéo vào đây là thêm một nguồn lỗi cấu hình cho
một quyết định chỉ cần vài dòng.

### Shortlist

**Đã sửa so với thiết kế ban đầu.** Bản đầu định bỏ hẳn cổng
`routeQuestionToTopic` và chỉ giữ ngưỡng điểm (`≥ 1` để vào shortlist,
`≥ 2` để mở nhánh). Bộ câu hỏi vàng bác bỏ cách đó: điểm khớp là túi âm
tiết nên rất ồn — "Xin visa du học Nhật Bản mất bao lâu?" đạt 4 điểm với
một điều luật giao thông, "quyết toán thuế" đạt 3, "đăng ký kết hôn" đạt
2. Ngưỡng nào cũng vừa lọt câu ngoài phạm vi vừa chặn câu trong phạm vi.

Cổng thật là bộ định tuyến lĩnh vực dùng chung của DEC-017, thứ đã được
hiệu chỉnh đúng cho nhược điểm này (comment trong `knowledge-router.ts`
nêu đích danh "xin visa du học Nhật"). `routeQuestionToTopic` trả `null`
thì dừng ngay: không đọc dữ liệu, không gọi model. Có lĩnh vực rồi thì
chỉ lấy ứng viên thuộc lĩnh vực đó, ngưỡng trong lĩnh vực hạ xuống
`score ≥ 1` vì phân biệt liên quan/không liên quan giờ là việc của model.
Lấy 8 ứng viên điểm cao nhất, chốt tổng độ dài evidence để giữ mốc 3 giây.

Đây vẫn là chỗ giải quyết "trả lời được nhiều câu hơn": câu đúng lĩnh vực
nhưng trượt ngưỡng `findLibraryAnswer` hôm nay rơi thẳng xuống
*unavailable*, từ giờ vẫn được đưa lên model cùng 8 ứng viên.

Hai từ khoá được thêm vào `lib/topics.ts` để bộ định tuyến bắt được câu
đời thực ("chưa đủ tuổi điều khiển xe", "xe 50cc" cho Giao thông; "nhắn
tin đe dọa" cho Bạo lực học đường). Từ khoá dùng chung nên phải chọn hẹp:
"giấy phép lái xe" và "bạn cùng lớp" từng được thử rồi bỏ vì kéo câu
"cổ vũ đua xe" sang Giao thông và "quay clip bạn cùng lớp" sang Bạo lực
học đường.

## Đa lượt

`buildChatContext` nhận diện câu hỏi nối tiếp bằng dấu hiệu xác định:
câu ngắn, mở đầu bằng "thế còn" / "vậy" / "còn nếu" / "cái đó", hoặc
không còn token mang nghĩa sau khi bỏ từ đệm. Nếu là câu nối tiếp thì
ghép với câu hỏi trước (chặn 600 ký tự — giới hạn composer) và gộp thêm
evidence của câu trước vào shortlist bằng cách chạy lại lọc thô trên câu
hỏi cũ.

Server tự suy ra từ lịch sử, **không tin id nào do client gửi lên**. Hợp
đồng API không đổi, client không phải sửa.

## Dựng câu trả lời

Model trả prose không chứa chữ số. Server dựng phần định lượng từ dữ
liệu chuẩn và **chỉ dựng cho evidence mà model thật sự trích dẫn**:

- `sanctions` ← `entry.penalty` nguyên văn
- `legal_basis` ← `reviewedCitationsToLegalBasisSection()` đã có sẵn,
  dựng từ đúng điều/khoản/điểm của evidence được trích
- prose của model đi vào `summary` / `details` / `examples` /
  `next_steps` / `limitations`
- `sources` ← `official_url` của các nguồn được trích, khử trùng lặp

Căn cứ pháp lý vì thế bám theo nội dung câu trả lời.

### Gợi ý hỏi tiếp

Do **server dựng**, không phải model — vì mọi chữ trong output của model
bị cấm chứa chữ số, mà gợi ý tự nhiên nhất lại là "Nếu em chưa đủ 16
tuổi thì sao?". Hàm thuần `suggestFollowUps(citedEvidence)` sinh tối đa
3 gợi ý từ mẫu câu cố định, chọn theo metadata evidence được trích.

## An toàn

- Hai ổ khoá: `AI_REPHRASE_ENABLED` (đã có, bật thành phần composer) và
  `AI_GROUNDED_CHAT_ENABLED` (mới, bật nhánh chat). Phải bật cả hai.
  Tắt một cái là quay về hành vi hôm nay tức thì, không cần deploy.
- Timeout riêng `AI_GROUNDED_TIMEOUT_MS`, mặc định 2500ms (mặc định của
  composer là 10 giây, quá dài so với mốc 3 giây).
- Rate limit và cổng chặn ý định ảnh/an toàn khẩn cấp giữ nguyên, vẫn
  chạy trước.
- Mọi mã lỗi composer → chạy tiếp cascade cũ, không trả lỗi cho người
  dùng.

### Ngân sách token theo ngày: hoãn có chủ ý

Nhánh này **chưa** có ngân sách token theo ngày riêng ở v1. Cơ chế
reserve/settle hiện có (`web_search_budget_days`) khoá theo ngày, không
có cột phân luồng ngân sách; tách luồng thứ hai nghĩa là migration trên
một bảng đang gánh cơ chế an toàn của web-search. Với v1 flag-off, chi
phí đã bị chặn ba lớp: rate limit sẵn có, `max_output_tokens: 1600`, và
trần kích thước input (8 evidence × ≤4000 ký tự).

Điều kiện kích hoạt việc bổ sung ngân sách: telemetry cho thấy token
tiêu thụ hằng ngày của nhánh này vượt ngân sách web-search hiện hành.

### DEC-019 — cần chủ dự án duyệt riêng

Hôm nay câu hỏi của HSSV chưa bao giờ rời khỏi hệ thống; shadow mode chỉ
gửi fixture kỹ thuật. Nhánh mới gửi câu hỏi thật lên OpenAI. DEC-009 đã
ghi trước: "`store:false` không phải ZDR; dữ liệu học sinh cần
data-control + under-18 privacy/safety gate."

Giảm thiểu: chỉ gửi câu hỏi đã gộp (≤600 ký tự), không gửi lịch sử thô,
không gửi định danh nào, `store: false`, `sanitizeQuestion` lọc ký tự
điều khiển. Kèm một dòng thông báo trên giao diện chat cho người dùng
biết câu hỏi được xử lý bởi dịch vụ AI bên ngoài.

Đó là giảm thiểu, không phải xoá bỏ. DEC-019 phải được ghi vào PRD trước
khi bật flag ở production.

## Ranh giới với DEC-009 tự được giữ

Hai test canh gác hiện có kiểm tra **nội dung file**
`app/api/chat/route.ts` không chứa `openai-evidence` hay
`composeEvidenceAnswer` (`tests/openai-evidence.test.mjs`), và
`legal-evidence-retriever.ts` không chạm composer
(`tests/legal-evidence-retriever.test.mjs`). Route chỉ import
`@/lib/grounded-answer`, nên **cả hai vẫn xanh không cần sửa** — hàng
rào cũ tự ép ranh giới "route chỉ chạm composer qua đúng một module".

Thêm một hàng rào mới: `grounded-answer` không được gọi provider khi
flag tắt.

## Đo lường

`chat.completed` thêm `answerOrigin: "grounded_library"`, mã lỗi
composer khi thất bại, `shortlistSize`, `citedEvidenceCount`, token
vào/ra, `latencyMs`, phiên bản policy.

Hai chỉ số quyết định sau này có cần vector index hay không: tỉ lệ
`unavailable`, và tỉ lệ model trả lời được trên shortlist đã cho.

## Kiểm thử

| Test | Nội dung |
|---|---|
| `tests/chat-context.test.mjs` | Nhận diện câu nối tiếp, ghép câu, chặn độ dài, **không** nhiễm chủ đề khi người dùng đổi đề tài |
| `tests/evidence-shortlist.test.mjs` | Loại bản ghi thiếu bốn mắt / checksum lệch / hết hiệu lực / quá hạn verify / dấu thời gian không chuẩn hoá được; cắt đúng 8 |
| `tests/grounded-answer.test.mjs` | Fake `fetch`: composition hợp lệ → sections đúng thứ tự và mọi chữ số truy về DB; từng mã lỗi composer → rơi xuống fallback; flag tắt → không gọi provider |
| `tests/grounded-chat-golden.test.mjs` | Bộ 30 câu hỏi vàng (`fixtures/grounded-chat/questions.v1.json`): 24 câu trong phạm vi mở được cổng và rơi đúng lĩnh vực, 6 câu ngoài phạm vi không kéo theo lần gọi nào |

Phần thuần của shortlist (chấm điểm, lọc tươi mới, ánh xạ hàng → 
`EvidenceRecord`, cắt 8) được tách thành hàm thuần để test không cần DB.

## Không làm

Không vector DB. Không streaming. Không nhớ hội thoại qua nhiều phiên
hay hồ sơ người dùng. Không cho model viết số hay tự trích dẫn. Không
đụng vào cascade web-search. Không sửa `legal-evidence-retriever.ts`.

## Cách bật

Flag tắt → merge → chạy shadow đối chiếu (`ai-shadow.ts` đã có) → bật
staging → ghi DEC-019 vào PRD → bật production, theo dõi telemetry.
