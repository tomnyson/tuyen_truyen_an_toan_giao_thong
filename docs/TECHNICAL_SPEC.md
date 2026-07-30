# Technical Specification — Luật Học Đường

> Trạng thái: Sprint 1B — citation schema foundation expand-only.

## 1. Mục tiêu kỹ thuật

Luật Học Đường hỗ trợ học sinh tra cứu và hỏi đáp thông tin pháp luật theo
luồng:

1. Đưa ra kết luận ngắn, dễ hiểu.
2. Nêu căn cứ pháp lý có thể kiểm chứng.
3. Giải thích ý nghĩa trong ngữ cảnh câu hỏi.
4. Đưa ví dụ minh họa.
5. Đề xuất hành động an toàn, phù hợp.

Kiến trúc đích tuân theo nguyên tắc **citation-first**: dữ liệu đã được kiểm
duyệt là nguồn sự thật; AI chỉ hỗ trợ diễn giải dữ liệu được truy xuất, không tự
tạo điều luật, mức phạt hoặc đường dẫn nguồn.

## 2. Phạm vi

### Trong phạm vi

- Trang công khai tra cứu nội dung pháp luật.
- Chat hỏi đáp tiếng Việt.
- Căn cứ pháp lý và ví dụ minh họa.
- CMS quản trị, kiểm duyệt và xuất bản nội dung.
- Authentication cho quản trị viên.
- Lưu trữ trên Cloudflare D1 theo production target đã chốt tại DEC-001;
  application service/repository không được phụ thuộc trực tiếp vào API D1 ngoài
  adapter lưu trữ.
- Tích hợp OpenAI Responses API hoặc Vercel AI Gateway làm lớp diễn giải dự
  phòng.

### Ngoài phạm vi MVP

- Tư vấn pháp lý cá nhân cho vụ việc cụ thể.
- Tự động crawl và xuất bản văn bản pháp luật.
- Vector database khi chưa có dữ liệu chứng minh nhu cầu.
- Tài khoản hoặc hồ sơ cá nhân của học sinh.
- AI tự tạo hoặc tự xác nhận căn cứ pháp lý.
- Thay thế việc kiểm tra văn bản chính thức và ý kiến của người có chuyên môn.

## 3. Kiến trúc hiện tại (As-is)

### 3.1 Thành phần

| Thành phần | Hiện trạng | Vị trí |
|---|---|---|
| Trang công khai | Next.js client UI, tìm kiếm/lọc và chat | `app/page.tsx` |
| Nội dung nền | Điều luật, nguồn và ví dụ hard-code | `lib/legal-content.ts` |
| Public content API | Đọc `law`/`showcase` đã `published`; trả mảng rỗng khi D1 lỗi | `app/api/content/route.ts` |
| Chat API | Managed knowledge → hard-code knowledge → fail-closed | `app/api/chat/route.ts` |
| Retrieval | Chấm điểm keyword đơn giản trên tối đa 100 bài published | `lib/legal-chat.ts` |
| CMS API | CRUD trực tiếp qua Drizzle; trạng thái `draft`/`published` | `app/admin/api/content/route.ts` |
| Admin auth | Một credential từ env, cookie phiên ký HMAC, TTL 8 giờ | `lib/admin-auth.ts` |
| Data layer | Drizzle ORM trên Cloudflare D1; citation foundation đã có schema nhưng chưa nối read/write API | `db/`, `drizzle/0001_citation_foundation.sql` |
| Runtime | Next.js qua Vinext/Cloudflare Worker | `worker/index.ts` |

### 3.2 Luồng chat hiện tại

```text
POST /api/chat
  ├─ validate/sanitize tối đa 8 message, 600 ký tự/message
  ├─ findManagedAnswer(question)
  │    └─ D1: legal_entries có status=published
  ├─ findCuratedAnswer(question)
  │    └─ keyword trên dữ liệu hard-code
  └─ không match: trả mode=unavailable
```

Điểm an toàn đang có:

- Không nhận role ngoài `user` và `assistant`.
- Không yêu cầu dữ liệu cá nhân trong system prompt.
- Ưu tiên nội dung CMS đã xuất bản.
- Ngoài retrieval, hệ thống trả lời fail-closed và không gọi AI provider
  (DEC-002).
- Mutation CMS yêu cầu admin session và same-origin.

Giới hạn hiện tại:

- Response chat chủ yếu là một chuỗi `answer`; citation và ví dụ chưa có contract
  độc lập.
- `legal_basis` là text tự do, chưa liên kết tới nguồn/điều/khoản có cấu trúc.
- Evidence-bound AI composition chưa được triển khai; provider fallback cũ đã
  bị vô hiệu để không gửi câu hỏi ngoài retrieval sang AI kiến thức mở.
- Giới hạn 180 từ mới là prompt instruction, chưa được validate sau khi sinh.
- Search theo keyword, chưa có alias, synonym, confidence hoặc lý do match.
- Workflow nội dung chỉ có `draft` và `published`; chưa có bước review/audit.
- Một tài khoản admin; chưa có role, rate limit, lockout hay audit trail.
- Schema được tạo cả bằng migration và `CREATE TABLE IF NOT EXISTS` tại runtime.

### 3.3 API contract hiện tại

#### `POST /api/chat`

Request:

```json
{
  "messages": [
    { "role": "user", "content": "Không đội mũ bảo hiểm bị phạt thế nào?" }
  ]
}
```

Success:

```json
{
  "answer": "Nội dung trả lời dạng text...",
  "mode": "knowledge"
}
```

`mode` runtime hiện có thể trả: `knowledge`, `unavailable`. Mode `ai` được
deferred cho tới khi có evidence bundle và output validation.

Invalid input:

```json
{
  "error": "Bạn hãy nhập một câu hỏi trước nhé."
}
```

Status: `400`.

#### `GET /api/content`

```json
{
  "laws": [],
  "showcases": []
}
```

Chỉ trả nội dung `published`. Khi database không khả dụng, endpoint vẫn trả
status thành công với hai mảng rỗng.

#### `/admin/api/content`

- `GET`: lấy toàn bộ laws/showcases sau khi xác thực.
- `POST`: tạo `law` hoặc `showcase`.
- `PATCH`: cập nhật toàn bộ field bắt buộc của một record.
- `DELETE`: xóa record theo `entity` và `id`.

Mutation yêu cầu cookie admin và header `Origin` cùng origin.

### 3.4 Safety hotfix Sprint 1A — nguồn hết hiệu lực

CR-001 xác nhận Nghị định 131/2013/NĐ-CP hết hiệu lực toàn bộ từ 15/02/2026.
Trong khi chưa có người duyệt nội dung nội bộ phê duyệt mapping thay thế,
runtime áp
dụng fail-closed:

- hai mục hard-code dẫn Nghị định 131 không còn được export qua `laws`;
- nguồn Nghị định 131 không còn xuất hiện trong `sources`;
- public content API và managed chat retrieval loại record có `legal_basis`
  dẫn Nghị định 131;
- admin API từ chối tạo/cập nhật record ở trạng thái `published` khi
  `legal_basis` khớp deny-list Nghị định 131;
- `legalContext` không nhận hai mục bị chặn;
- câu hỏi đạo văn/bản quyền không còn curated answer và trả `unavailable` kể cả
  khi có provider credential; provider không được gọi nếu retrieval không trả
  evidence bundle (DEC-002).

Hotfix không mapping sang Nghị định 341/2025/NĐ-CP hay bất kỳ điều khoản thay
thế nào. Việc mapping, mức phạt, seed và khôi phục nội dung public phải chờ người
duyệt pháp lý xác nhận.

## 4. Kiến trúc đích (To-be)

### 4.1 Nguyên tắc

1. **Citation-first:** kết luận pháp lý chỉ được xuất bản khi có ít nhất một
   provision đã được kiểm duyệt và còn hiệu lực theo dữ liệu hệ thống.
2. **Structured output:** frontend nhận conclusion, explanation, examples,
   actions và citations bằng field riêng.
3. **Grounded generation:** AI chỉ diễn giải evidence bundle mà retrieval đã
   chọn; không được thêm số điều, mức phạt hoặc URL ngoài bundle.
4. **Fail closed:** không đủ evidence hoặc confidence thấp thì báo chưa đủ dữ
   liệu và chỉ dẫn người dùng kiểm tra nguồn chính thức.
5. **Human review:** thay đổi nội dung pháp lý phải qua review trước publish.
6. **Traceability:** ghi nhận version, reviewer, thời điểm kiểm chứng và nguồn
   dùng cho mỗi câu trả lời.

### 4.2 Thành phần đích

```text
Public UI / Admin UI
        │
        ├── Public Content API
        ├── Structured Legal Answer API
        └── Admin Content & Review API
                 │
        Application services
        ├── Query classifier
        ├── Retrieval/ranking
        ├── Evidence validator
        ├── Answer composer
        └── Publication workflow
                 │
        Repositories (Drizzle)
                 │
        Storage repository boundary
        └── Cloudflare D1 adapter (proposed default)
        ├── sources / provisions
        ├── answers / citations / examples
        ├── topics / aliases
        └── revisions / audit events
```

AI provider nằm sau `Answer composer`. Provider chỉ nhận:

- câu hỏi đã sanitize;
- evidence bundle có ID, original text và official URL;
- output schema bắt buộc.

Response của provider phải qua schema validation và citation validation trước
khi trả cho client.

## 5. Data model đề xuất (To-be)

Tên bảng có thể điều chỉnh trong migration design, nhưng quan hệ và invariant
dưới đây là yêu cầu.

### 5.1 `legal_sources`

| Field | Kiểu đề xuất | Ràng buộc |
|---|---|---|
| `id` | integer | PK |
| `document_number` | text | required, ví dụ `168/2024/NĐ-CP` |
| `title` | text | required |
| `official_url` | text | required, HTTPS, domain được cho phép |
| `official_host` | text | required, lowercase host không chứa ký tự ngoài `a-z0-9.-` hoặc `..` |
| `issued_at` | text/date | nullable |
| `effective_from` | text/date | required trước publish |
| `effective_to` | text/date | nullable |
| `status` | text | `draft`, `in_force`, `expired`, `superseded` |
| `created_by` | text/integer | required |
| `last_verified_at` | text/datetime | required trước publish |
| `verified_by` | text/integer | required khi `in_force`; khác `created_by` |
| `created_at`, `updated_at` | text/datetime | required |

`official_url` không được dùng để tự parse host trong SQL. Biên tập/API phải lưu
host đã canonicalize riêng vào `official_host`; database buộc authority ngay sau
`https://` phải khớp chính xác field này và chỉ cho delimiter kết thúc, `/`, `?`
hoặc `#`. Source khác `draft` chỉ chấp nhận `official_host` bằng `vbpl.vn`,
`vbpl.moj.gov.vn`, `chinhphu.vn` hoặc có suffix `.chinhphu.vn` (DEC-004).
Thiết kế này chặn suffix/path/query/fragment giả như
`https://evil.example?.chinhphu.vn/...`.

### 5.2 `legal_provisions`

| Field | Kiểu đề xuất | Ràng buộc |
|---|---|---|
| `id` | integer | PK |
| `source_id` | integer | FK → `legal_sources.id` |
| `article` | text | nullable |
| `clause` | text | nullable |
| `point` | text | nullable |
| `original_text` | text | required |
| `simplified_text` | text | required |
| `status` | text | `draft`, `pending_review`, `published`, `archived` |
| `created_by` | text/integer | required |
| `reviewed_by` | text/integer | required khi published; khác `created_by` |
| `reviewed_at` | text/datetime | required khi published |
| `created_at`, `updated_at` | text/datetime | required |

Một provision `published` chỉ hợp lệ khi source liên quan đang `in_force` và đã
được kiểm chứng. SQLite không hỗ trợ cross-table `CHECK`, vì vậy migration và
runtime bootstrap cùng tạo `BEFORE INSERT`/`BEFORE UPDATE` triggers trên
`legal_provisions`. Drizzle schema mô tả field/FK/check nội bảng; trigger SQL là
phần bắt buộc của migration contract.

Migration/bootstrap còn có `AFTER UPDATE` trigger trên `legal_sources`. Khi
source không còn thỏa `in_force` + metadata kiểm chứng + bốn mắt, mọi provision
`published` phụ thuộc source đó tự chuyển về `pending_review`, xóa
`reviewed_by`/`reviewed_at` và cập nhật `updated_at`. Đây là state invalidation,
không phải xóa nội dung.

### 5.3 `legal_topics`

| Field | Kiểu đề xuất | Ràng buộc |
|---|---|---|
| `id` | integer | PK |
| `slug` | text | unique |
| `name` | text | required |
| `description` | text | nullable |
| `status` | text | `active`, `inactive` |

### 5.4 `legal_answers`

| Field | Kiểu đề xuất | Ràng buộc |
|---|---|---|
| `id` | integer | PK |
| `topic_id` | integer | FK → `legal_topics.id` |
| `canonical_question` | text | required |
| `conclusion` | text | required |
| `explanation` | text | required |
| `recommended_actions` | text/JSON | JSON array |
| `warnings` | text/JSON | JSON array |
| `status` | text | `draft`, `pending_review`, `published`, `archived` |
| `version` | integer | tăng khi publish revision mới |
| `reviewed_by`, `reviewed_at` | text/datetime | required khi published |
| `created_at`, `updated_at` | text/datetime | required |

### 5.5 Bảng liên kết và ví dụ

Foundation Sprint 1B dùng `legal_entry_citations` để liên kết
`legal_entries` hiện tại với `legal_provisions`. Khóa chính ghép
(`legal_entry_id`, `provision_id`) ngăn citation trùng; `display_order` không âm.
Xóa entry sẽ cascade bản ghi join, còn xóa provision đang được tham chiếu bị
restrict. Bảng này chưa được API/CMS sử dụng và chưa có seed.

Khi `legal_answers` canonical được triển khai, quan hệ đích là
`legal_answer_citations`

- `answer_id` FK → `legal_answers.id`
- `provision_id` FK → `legal_provisions.id`
- `display_order`
- unique (`answer_id`, `provision_id`)

`legal_examples`

- `id`, `answer_id`
- `title`
- `scenario`
- `outcome`
- `display_order`
- `status`

`legal_answer_aliases`

- `id`, `answer_id`
- `question`
- `normalized_question`
- `keywords` JSON

### 5.6 Audit và revision

Tối thiểu cần:

- `content_revisions`: entity type/id, version, snapshot JSON, actor, created_at.
- `audit_events`: action, entity type/id, actor, request metadata tối thiểu,
  created_at.

Không lưu nội dung chat hoặc dữ liệu cá nhân vào audit log nếu không có mục
đích, thời hạn lưu trữ và cơ sở xử lý rõ ràng.

## 6. API contract đích

### 6.1 `POST /api/v1/legal-answers`

Request:

```json
{
  "question": "Không đội mũ bảo hiểm bị phạt thế nào?",
  "conversation": [
    {
      "role": "user",
      "content": "Em đang hỏi trường hợp đi xe máy điện."
    }
  ]
}
```

Ràng buộc:

- `question`: required, sau trim từ 1 đến 600 ký tự.
- `conversation`: optional, tối đa 7 message trước câu hỏi hiện tại.
- Chỉ nhận role `user`/`assistant`.
- Không nhận system prompt từ client.

Success:

```json
{
  "requestId": "req_01...",
  "mode": "curated",
  "confidence": "high",
  "answer": {
    "conclusion": "Đi xe máy điện mà không đội mũ bảo hiểm là hành vi vi phạm.",
    "explanation": "Quy định áp dụng cho người điều khiển phương tiện thuộc phạm vi tương ứng.",
    "examples": [
      {
        "title": "Đi xe tới trường",
        "scenario": "Minh để mũ trong cốp nhưng không đội khi điều khiển xe.",
        "outcome": "Việc có mang theo mũ không thay thế yêu cầu phải đội và cài quai đúng cách."
      }
    ],
    "recommendedActions": [
      "Đội mũ đạt chuẩn và cài quai đúng cách trước khi di chuyển."
    ],
    "warnings": [
      "Việc áp dụng thực tế còn phụ thuộc độ tuổi, loại phương tiện và tình tiết cụ thể."
    ]
  },
  "citations": [
    {
      "sourceId": 12,
      "provisionId": 42,
      "documentNumber": "168/2024/NĐ-CP",
      "documentTitle": "Tên đầy đủ của văn bản",
      "provision": "Điểm … khoản … Điều …",
      "officialUrl": "https://example.gov.vn/...",
      "effectiveFrom": "2025-01-01",
      "lastVerifiedAt": "2026-07-29T00:00:00Z"
    }
  ]
}
```

`mode` đích:

- `curated`: trả trực tiếp nội dung đã kiểm duyệt.
- `ai_assisted`: AI diễn giải evidence đã kiểm duyệt; citation do server gắn.
- `unavailable`: không đủ evidence hoặc dependency không khả dụng.

`confidence` là `high`, `medium`, `low`; response có kết luận pháp lý chỉ được
trả khi đạt threshold được cấu hình. Không dùng confidence do model tự khai báo.

Unavailable vẫn trả schema ổn định:

```json
{
  "requestId": "req_01...",
  "mode": "unavailable",
  "confidence": "low",
  "answer": {
    "conclusion": "Cổng chưa có đủ dữ liệu đã kiểm duyệt để trả lời câu hỏi này.",
    "explanation": "",
    "examples": [],
    "recommendedActions": [
      "Kiểm tra văn bản chính thức hoặc trao đổi với phụ huynh, giáo viên hay người có chuyên môn."
    ],
    "warnings": []
  },
  "citations": []
}
```

### 6.2 Error contract

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Bạn hãy nhập một câu hỏi trước nhé.",
    "requestId": "req_01..."
  }
}
```

Mã dự kiến:

- `INVALID_REQUEST` — `400`
- `UNAUTHORIZED` — `401`
- `FORBIDDEN` — `403`
- `RATE_LIMITED` — `429`
- `INTERNAL_ERROR` — `500`

Không trả stack trace, provider response hoặc secret cho client.

### 6.3 Tương thích API

Trong rollout, `/api/chat` tiếp tục trả contract cũ. Endpoint v1 mới chạy song
song; frontend chuyển sang v1 sau khi có test và telemetry. Chỉ xóa contract cũ
khi đã có deprecation window và xác nhận không còn consumer.

## 7. Retrieval và answer composition (To-be)

### 7.1 Pipeline

1. Validate, trim, giới hạn độ dài và chuẩn hóa Unicode.
2. Loại bỏ dữ liệu không cần thiết; phát hiện intent an toàn/khẩn cấp.
3. Phân loại topic bằng rule hoặc classifier có output schema.
4. Tìm exact alias/canonical question.
5. Tìm keyword/FTS trên title, aliases, provision và tags.
6. Rank theo:
   - độ khớp canonical/alias;
   - topic;
   - số keyword quan trọng;
   - trạng thái published;
   - hiệu lực và thời điểm kiểm chứng nguồn.
7. Tạo evidence bundle từ answer, provisions, sources và examples.
8. Validate invariant: citation tồn tại, source còn hiệu lực, URL hợp lệ,
   `last_verified_at` còn trong policy.
9. Nếu match chắc chắn, trả curated answer.
10. Nếu cần diễn giải, gửi duy nhất evidence bundle tới AI và validate structured
    output.
11. Server gắn citation từ database theo ID; bỏ mọi citation do model tự thêm.
12. Không đủ evidence hoặc output invalid: trả `unavailable`.

### 7.2 Threshold

Threshold phải cấu hình và được đánh giá trên một tập câu hỏi chuẩn. Không chốt
con số chỉ dựa trên cảm tính. Trước khi production:

- xây tập câu hỏi positive/negative theo ba topic;
- đo precision của citation và tỷ lệ unavailable;
- ưu tiên precision hơn coverage;
- ghi version của ranking config trong log kỹ thuật.

### 7.3 Khi nào dùng vector search

MVP dùng D1 với alias, normalized text và FTS/keyword. Chỉ bổ sung embedding khi:

- tập đánh giá chứng minh keyword/FTS không đạt recall mục tiêu;
- có quy trình re-index/version embedding;
- vẫn bảo đảm citation gắn từ record đã kiểm duyệt;
- chi phí và độ trễ được đo.

## 8. CMS và publication workflow (To-be)

```text
draft → pending_review → published → archived
             │              │
             └── rejected   └── tạo revision mới, không sửa lịch sử
```

Yêu cầu:

- Người soạn không tự duyệt nội dung của chính mình khi đã có nhiều role.
- Publish answer yêu cầu ít nhất một provision hợp lệ.
- Publish provision yêu cầu source hợp lệ, official URL HTTPS, ngày hiệu lực và
  `last_verified_at`.
- Chỉnh nội dung published tạo revision mới.
- Archive không xóa lịch sử.
- Hard delete chỉ dành cho dữ liệu draft chưa từng publish và phải có audit.
- Public API chỉ đọc revision published mới nhất.

## 9. Security và privacy

### 9.1 Hiện có (As-is)

- Credential admin đọc server-side từ env.
- So sánh credential thông qua digest để giảm timing leak.
- Session ký HMAC SHA-256, secret tối thiểu 32 ký tự, TTL 8 giờ.
- Cookie `HttpOnly`, `SameSite=Strict`, `Secure` trên HTTPS, path `/admin`.
- Mutation admin và login/logout kiểm tra same-origin.
- Chat giới hạn số lượng và độ dài message.

### 9.2 Bắt buộc trước production (To-be)

- Không dùng `admin/admin`; provision credential mạnh qua secret manager.
- Không log password, session token, API key, OIDC token hoặc provider payload có
  dữ liệu nhạy cảm.
- Rate limit theo IP/anonymous session cho login và chat; có backoff/lockout phù
  hợp cho login.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` và frame protection.
- Kiểm tra allowlist domain cho official URL.
- Phân quyền tối thiểu `editor`, `reviewer`, `admin`.
- Rotate session secret có kế hoạch làm hết hạn session cũ.
- Audit login thất bại ở mức không tiết lộ credential.
- Timeout, retry có giới hạn và circuit breaker cho AI provider.
- Schema validation cho mọi body và AI output.
- Giới hạn kích thước request ở edge.
- Chính sách retention cho log/chat; mặc định không lưu toàn bộ câu hỏi.
- Dependency scanning, secret scanning và backup/restore D1 được kiểm thử.

## 10. Migration và rollout

### Phase 0 — Documentation

- Chốt user stories, acceptance criteria và technical specification.
- Đồng bộ `.env.example` với code hiện tại.
- Không đổi runtime/schema.

### Phase 1 — Expand schema

- Thêm bảng mới, index, foreign key và constraint bằng migration có version.
- Không xóa `legal_entries`/`showcases`.
- Bổ sung repository/service layer phía sau API hiện tại.
- Kiểm thử migration trên bản sao D1 và kiểm thử rollback/restore.
- Sprint 1B đã thêm foundation `legal_sources`, `legal_provisions` và
  `legal_entry_citations` bằng migration expand-only
  `drizzle/0001_citation_foundation.sql`. `legal_entry_citations` tạm liên kết
  model answer hiện tại (`legal_entries`) với provision; khi `legal_answers`
  canonical được triển khai sẽ có migration quan hệ mới, không đổi nghĩa bảng
  cũ một cách ngầm định.
- Migration versioned là source of truth cho production. `db/index.ts` vẫn có
  DDL idempotent tương ứng chỉ để giữ local/Sites bootstrap hiện tại; đường
  bootstrap này phải được loại bỏ khi migration pipeline đã được xác minh.
- Không có seed/backfill trong Sprint 1B. Không record nào được tự động coi là
  nguồn đã kiểm chứng và không mapping sang văn bản thay thế khi chưa có
  người duyệt nội dung nội bộ phê duyệt.
- Migration 0001 là idempotent cho table/index/trigger creation và đã có entry
  thứ tự trong `drizzle/meta/_journal.json`. Môi trường authoring không có
  `drizzle-kit`, nên không tạo snapshot giả. Trước khi dùng workflow Drizzle Kit
  phụ thuộc snapshot, phải regenerate/validate metadata bằng version đã pin.
- Thứ tự migration-before-code, verification và restore procedure nằm tại
  `docs/MIGRATION_RUNBOOK.md`.
- Production không có `wrangler.toml/json` hoặc `migrations_dir` đủ để suy ra
  database đích an toàn. Repository hiện chỉ chứng minh contract đóng gói:
  `build/sites-vite-plugin.ts` đưa `.openai/hosting.json` và toàn bộ `drizzle/`
  vào `dist/.openai`. Static test cho contract này không phải bằng chứng
  migration đã được thực thi.
- Việc Sites control plane đọc artifact, apply migration đúng một lần và hoàn
  tất trước khi activate version hiện **UNVERIFIED**. Kiểm tra read-only hiện
  tại không resolve được project tham chiếu trong `.openai/hosting.json`, nên
  quyền sở hữu/truy cập project và D1 binding cũng chưa được xác minh. Production
  deployment bị block cho tới khi control plane cung cấp trạng thái và bằng
  chứng migration-before-activation. Không tạo/thay project ID hoặc chạy raw
  `wrangler d1 migrations apply` bằng binding/name suy đoán.

### Phase 2 — Backfill và review

- Map từng `legal_entry` sang answer/source/provision/example ở trạng thái draft.
- Không tự động coi text cũ là nguồn đã xác minh.
- Reviewer xác nhận official URL, điều/khoản/điểm, hiệu lực và mức phạt.
- Ghi báo cáo record không backfill được hoặc bị trùng.

### Phase 3 — Dual read / shadow evaluation

- Retrieval mới chạy shadow, không ảnh hưởng response người dùng.
- So sánh result cũ/mới trên tập câu hỏi chuẩn.
- Theo dõi latency, match quality, citation validity và unavailable rate.
- Không ghi song song nếu chưa có idempotency và consistency strategy rõ ràng.

### Phase 4 — API v1 và frontend cutover

- Ra `/api/v1/legal-answers`.
- Frontend render từng phần và link citation rõ ràng.
- Feature flag cho phép quay về `/api/chat`.
- Canary rollout, theo dõi error/latency và feedback.

### Phase 5 — CMS workflow

- Bật `pending_review`, revision, reviewer và audit.
- Chuyển quyền publish từ workflow cũ.
- Đóng đường publish không có citation.

### Phase 6 — Cleanup

- Deprecate contract chat cũ.
- Chỉ xóa bảng/field cũ sau backup, retention window và xác nhận không còn
  consumer.
- Loại bỏ `CREATE TABLE IF NOT EXISTS` runtime khi migration pipeline đã đáng
  tin cậy.

## 11. Observability

Log kỹ thuật tối thiểu:

- `request_id`;
- route, status, latency;
- answer mode;
- retrieved answer/provision IDs;
- ranking config/version;
- provider name, latency và error class;
- validation outcome.

Metric:

- request volume và latency p50/p95/p99;
- tỷ lệ `curated`/`ai_assisted`/`unavailable`;
- tỷ lệ response có citation hợp lệ;
- retrieval no-match và false-positive trên evaluation;
- provider timeout/error;
- login failure và rate-limit event;
- publication/review throughput.

Không đưa nội dung câu hỏi nguyên văn vào log mặc định.

## 12. Testing strategy

### Unit

- Normalize tiếng Việt, alias và keyword.
- Ranking và threshold.
- Source/provision validity theo ngày hiệu lực.
- Contract test cho Drizzle schema/bootstrap parity, journal/file order và Sites
  packaging; contract packaging này không chứng minh migration đã chạy. Runtime
  theo engine bắt buộc phải có `node:sqlite`; thiếu module làm suite fail thay vì
  bỏ qua. Test thực thi migration, FK/index/check, URL-host authority, allowlist,
  bốn mắt, bất biến `created_by`, source invalidation, provision triggers và
  valid citation graph trong database in-memory.
- Response schema và citation validator.
- Input size, role filtering và safety intent.
- Auth signature, expiry, credential validation.

### Integration

- CRUD D1 cho source/provision/answer/citation/example.
- Constraint publish và state transition.
- Public API chỉ đọc revision published.
- Login/session/origin/rate limit.
- Provider success, timeout, malformed JSON và citation injection.
- Migration từ schema cũ và idempotency.

### End-to-end

- Học sinh hỏi câu có dữ liệu → thấy kết luận, căn cứ, ví dụ và link nguồn.
- Câu không có dữ liệu → không xuất hiện điều luật/mức phạt bịa.
- Editor tạo draft → reviewer duyệt → public thấy revision mới.
- Archive/hết hiệu lực → nội dung không còn được retrieval sử dụng.
- D1 hoặc provider lỗi → fallback/fail-closed đúng contract.

### Content evaluation

- Golden set do người am hiểu pháp luật duyệt cho ba topic MVP.
- Câu hỏi viết sai chính tả, không dấu, hỏi vòng và nhiều ý.
- Câu gần giống nhưng khác chủ thể, độ tuổi hoặc phương tiện.
- Câu nằm ngoài phạm vi.
- Kiểm tra 100% số điều, mức phạt, URL và ngày hiệu lực trong output đều map tới
  evidence.

## 13. Definition of Done kỹ thuật

Một feature citation-first chỉ được coi là hoàn thành khi:

- [ ] User story và acceptance criteria đã được PM chốt.
- [ ] As-is/to-be và contract liên quan đã cập nhật trong tài liệu.
- [ ] Database migration có forward path và restore/rollback procedure.
- [ ] API input/output được schema validate.
- [ ] Mọi kết luận có căn cứ đều map tới provision/source đã published.
- [ ] AI không thể thêm citation ngoài evidence bundle.
- [ ] Empty, malformed, unauthorized, timeout và dependency failure đã được test.
- [ ] Unit, integration, E2E và content evaluation liên quan đều pass.
- [ ] Security review không còn issue blocker/high.
- [ ] Logging/metric không thu thập secret hoặc dữ liệu cá nhân không cần thiết.
- [ ] Feature flag/rollback path đã được kiểm chứng.
- [ ] Reviewer nội dung xác nhận official URL, hiệu lực và cách diễn giải.
- [ ] README, env example và runbook được cập nhật.
- [ ] Code review hoàn tất và không còn comment bắt buộc chưa xử lý.

## 14. Quyết định kỹ thuật và điểm còn mở

### Quyết định đã chốt

- **DEC-001:** Cloudflare Worker + D1 là production primary.
- **DEC-002:** câu ngoài retrieval đã duyệt trả `unavailable`; AI không dùng
  kiến thức mở.
- **DEC-003:** bắt buộc bốn mắt. `created_by` phải khác `verified_by` khi source
  `in_force`, và khác `reviewed_by` khi provision `published`. Người duyệt là
  người duyệt nội dung nội bộ; `created_by` bất biến sau insert để không thể đổi
  người tạo rồi tự xác minh/duyệt.
- **DEC-004:** source khác `draft` chỉ được dùng HTTPS URL có authority khớp
  `official_host`; host thuộc `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` hoặc
  có suffix `.chinhphu.vn`.

### Điểm còn mở

Các điểm cần product/technical owner chốt trước Sprint 1:

1. `last_verified_at` quá bao lâu thì nội dung phải review lại?
2. MVP có cần phân biệt mức áp dụng theo độ tuổi ngay trong data model không?
3. Mục tiêu SLO cho latency và availability là bao nhiêu?
4. Có lưu câu hỏi ẩn danh để cải thiện retrieval không; nếu có, retention và cơ
   chế loại dữ liệu cá nhân là gì?
