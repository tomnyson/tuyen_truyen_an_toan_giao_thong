# Technical Specification — Luật Học Đường

> Trạng thái: Sprint 1B foundation; RAG/ingestion specification.
> Cập nhật gần nhất: 2026-07-31

## 1. Mục tiêu kỹ thuật

Luật Học Đường hỗ trợ học sinh tra cứu và hỏi đáp thông tin pháp luật theo
luồng:

1. Đưa ra kết luận ngắn, dễ hiểu.
2. Nêu căn cứ pháp lý có thể kiểm chứng.
3. Giải thích ý nghĩa trong ngữ cảnh câu hỏi.
4. Đưa ví dụ minh họa.
5. Đề xuất hành động an toàn, phù hợp.

Kiến trúc đích tuân theo nguyên tắc **RAG-first, citation-first**: dữ liệu đã
được kiểm duyệt là nguồn sự thật; hệ thống retrieve evidence trước khi AI hỗ
trợ phân tích, gợi ý hoặc diễn giải, và AI không tự tạo điều luật, mức phạt hoặc
đường dẫn nguồn.

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
- Tích hợp OpenAI Responses API hoặc provider adapter tương đương làm
  evidence-bound answer composer; provider không phải fallback kiến thức mở.
- Pipeline ingestion nguồn ngoài vào staging/draft có provenance và four-eyes.

### Ngoài phạm vi MVP

- Tư vấn pháp lý cá nhân cho vụ việc cụ thể.
- Tự động crawl và tự xuất bản văn bản pháp luật.
- Vector database khi chưa có dữ liệu chứng minh nhu cầu; D1 FTS5 là baseline
  RAG MVP.
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
| AI provider | Chưa có runtime consumer; `.env.example` mới chỉ ghi biến dự kiến | Chưa triển khai |
| Ingestion/index | Chưa có connector, raw staging/quarantine, scheduler hoặc FTS5 table | Chưa triển khai |

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
        ├── Source connector / ingestion
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

Optional platform services
        ├── R2 raw snapshots
        ├── Queue + dead-letter queue
        └── Vectorize (chỉ sau evaluation gate)
```

AI provider nằm sau `Answer composer`. Provider chỉ nhận:

- câu hỏi đã sanitize;
- evidence bundle có ID, original text và official URL;
- output schema bắt buộc.

Response của provider phải qua schema validation và citation validation trước
khi trả cho client.

Source connector chỉ lấy API/export có tài liệu hoặc HTML/PDF official theo
allowlist. Ingestion worker fetch/parse/checksum/dedupe và chỉ tạo
draft/candidate; raw document lỗi được đưa vào quarantine. Search baseline là D1
FTS5 kết hợp alias và structured filters.

**PROP-001 — chờ technical/product owner duyệt:** không tách public/admin/query
backend thành service riêng ở giai đoạn này. Nếu được duyệt, production
ingestion chạy trong một Worker/process riêng vì có outbound fetch, cron/batch,
parser untrusted và retry:

- public Worker giữ UI, public/admin/query API và không có source credential/R2
  raw access;
- ingestion Worker có source credential, R2 và Queue binding, chỉ được ghi
  raw/candidate/draft qua repository contract;
- hai Worker có thể dùng chung D1, nhưng constraint/four-eyes trong database vẫn
  là trust boundary cuối;
- single-document local spike có thể chạy thủ công; scheduled/batch production
  bắt buộc tách ingestion Worker. Queue bắt buộc khi có batch/retry nhiều
  document; R2 bắt buộc cho immutable raw snapshots.

Editor/reviewer xem raw snapshot qua protected read API của ingestion/review
Worker, được public/admin Worker gọi bằng service binding nội bộ sau khi đã xác
thực RBAC. Review Worker re-authorize actor/object, stream đúng object (hoặc cấp
capability URL exact-object tối đa 5 phút), ghi audit event và không lộ R2
credential. Không có public anonymous raw route.

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

### 5.7 Sanction và hiệu lực cấp provision

`legal_provisions` đích phải bổ sung:

- `revision_hash` hoặc FK tới source revision;
- `effective_from`, `effective_to`;
- `effectivity_status`: `draft`, `in_force`, `partially_in_force`,
  `superseded`, `expired`, `unknown`;
- `superseded_by_provision_id` nullable;
- `effectivity_note` và `last_verified_at`.

Một document còn hiệu lực không đủ để suy ra mọi điều/khoản còn hiệu lực.
Provision `unknown`, quá hạn freshness hoặc thuộc phần bị sửa/bãi bỏ không được
index. Provision `partially_in_force` cũng không được index trực tiếp:
editor phải tách phần còn hiệu lực thành provision span/revision riêng có
page/section anchors, gán `in_force` sau four-eyes review; phần bị sửa/bãi bỏ
được giữ lịch sử nhưng không vào FTS/evidence bundle.

Mức xử lý không tiếp tục là text tự do trong answer. Bảng `legal_sanctions`:

| Field | Yêu cầu |
|---|---|
| `id` | PK |
| `provision_id` | FK → `legal_provisions.id`, restrict delete |
| `measure_type` | `fine`, `warning`, `remedy`, `other` |
| `summary` | diễn giải đã duyệt |
| `amount_min`, `amount_max` | integer nullable; đơn vị nhỏ nhất của currency |
| `currency` | nullable, mặc định `VND` khi có amount |
| `subject_type` | cá nhân/tổ chức/chủ thể cụ thể |
| `age_min`, `age_max` | nullable; không tự suy ra |
| `applicability_conditions` | JSON có schema; điều kiện/ngoại lệ đã duyệt |
| `effective_from`, `effective_to` | hiệu lực riêng của sanction |
| `status`, `created_by`, `reviewed_by`, `reviewed_at` | creator bất biến và four-eyes publish guard |

Constraint: amount không âm; `amount_min <= amount_max`; có amount thì phải có
currency; `created_by` bất biến; sanction published chỉ được liên kết provision
published/in-force và `reviewed_by != created_by`. API chỉ trả mức xử lý từ bảng
này, không parse số tiền từ AI output hoặc legacy text.

### 5.8 Source registry và ingestion persistence

`source_registries`

- `id`, `provider_key` unique, `display_name`, `owner`;
- `trust_class`: `official`, `discovery_only`, `rejected`;
- `readiness`: `green`, `yellow`, `red`, `unverified`;
- `base_url`, `export_endpoint`, `allowed_hosts` JSON;
- `auth_type`, `terms_url`, `license_note`, `attribution_text`;
- `quota_note`, `update_cadence`, `retention_days`;
- `status`, `created_by`, `reviewed_by`, timestamps.

`ingestion_jobs`

- `id`, `source_registry_id` FK, job type, cursor, status;
- `requested_by`, `attempt_count`, counts, `error_code`, `trace_id`, timestamps.
- Job fetch/parse kết thúc ở `completed`, `partial_failed`, `failed` hoặc
  `cancelled`; human review không giữ ingestion job mở.

`raw_documents`

- `id`, `source_registry_id` FK, `external_id`, `canonical_url`;
- `fetched_at`, upstream timestamp/version, ETag, MIME, byte/page count;
- `raw_sha256`, immutable `raw_snapshot_ref`, parser version/status/error;
- unique (`source_registry_id`, `external_id`, `raw_sha256`).

Binary HTML/PDF snapshot lưu immutable trong R2; D1 chỉ giữ metadata và ref.
Không dùng D1 row làm raw binary store. Access chỉ dành cho ingestion worker,
editor/reviewer có audit; encryption dùng platform defaults. `retention_days`
phải được reviewer duyệt theo source terms. Snapshot đang làm provenance cho
published citation không được cleanup; cleanup job phải kiểm tra reference và
legal hold.

`ingestion_candidates`

- `id`, `raw_document_id` FK, target entity type, candidate JSON;
- `candidate_sha256`, extraction/parser version, status;
- `editor_id`, `reviewer_id`, review result/note, timestamps;
- unique (`raw_document_id`, `candidate_sha256`, target entity type).

Candidate được promote bằng transaction tạo source/provision revision và audit
event; reviewer phải khác editor. Reject là terminal cho candidate revision,
không xóa raw provenance.

`legal_search_fts` là FTS5 virtual table chỉ chứa text của revision đủ điều kiện
index và stable IDs về answer/provision/source. Migration phải tạo trigger hoặc
explicit indexer có test rebuild; FTS không phải source of truth.

Các bảng trên dùng expand-only migration. Trước activation phải test
backup/restore D1, R2 access/retention, unique/idempotency và rebuild FTS từ
canonical tables.

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
  "sanctions": [
    {
      "sanctionId": 7,
      "provisionId": 42,
      "measureType": "fine",
      "summary": "Mức phạt áp dụng cho chủ thể và hành vi đúng như điều kiện đã duyệt.",
      "amountMin": 400000,
      "amountMax": 600000,
      "currency": "VND",
      "applicabilityConditions": [
        "Chỉ áp dụng khi loại phương tiện và chủ thể khớp record đã duyệt."
      ]
    }
  ],
  "citations": [
    {
      "sourceId": 12,
      "provisionId": 42,
      "documentNumber": "168/2024/NĐ-CP",
      "documentTitle": "Tên đầy đủ của văn bản",
      "provision": "Điểm … khoản … Điều …",
      "officialUrl": "https://vanban.chinhphu.vn/...",
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
  "sanctions": [],
  "citations": []
}
```

Composer provider không trực tiếp tạo public response. Contract đích sau khi có
semantic claim-span validator sẽ dùng:

```json
{
  "claims": [
    {
      "claimType": "conclusion",
      "text": "Nội dung diễn giải...",
      "evidenceIds": ["provision:42"],
      "evidenceSpans": ["span:42:1"]
    }
  ],
  "exampleDrafts": [],
  "recommendedActionDrafts": []
}
```

Server chỉ render claim khi evidence IDs thuộc bundle và claim map vào
predicate/span cho phép. Số tiền, độ tuổi, ngày, số điều/khoản và điều kiện áp
dụng phải exact-match canonical record. Unknown citation ID, unsupported
exception/condition hoặc numeric mismatch làm output invalid và fail closed.

Contract claim/span trên chưa được triển khai. Adapter foundation hiện dùng
`EvidenceComposition` gắn evidence IDs ở mục 7.7, cấm model sinh chữ số và giữ
`/api/chat` tách rời. Việc chuyển từ foundation output sang claim/span contract
là gate riêng trước runtime integration.

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

Initial **proposed** production gate trên golden set được PM và internal content
reviewer gắn nhãn:

- 100% citation/evidence ID hợp lệ và 100% numeric/date/article field
  exact-match canonical record;
- 0 critical unsupported legal claim hoặc invented citation/amount;
- retrieval Recall@5 tối thiểu 90% cho câu in-scope;
- top-answer precision tối thiểu 95%;
- out-of-scope/insufficient-evidence refusal tối thiểu 95%;
- P95 curated dưới 2 giây, nhánh AI dưới 10 giây.

PM + internal content reviewer phải duyệt các ngưỡng này trước production; sau
khi có dữ liệu thật có thể recalibrate bằng decision record và rerun cùng
version golden set. Không được đánh `US-025`/`US-026` Done chỉ vì đã thu thập
metric hoặc khi gate chưa được duyệt/không đạt.

Freshness là policy versioned theo source/document type và do PM + internal
content reviewer duyệt. Khi chưa có policy được duyệt, hoặc
`last_verified_at` quá hạn theo policy, record bị loại khỏi index/retrieval.
Không dùng một TTL suy đoán để tự cho record đủ điều kiện.

### 7.3 Khi nào dùng vector search

MVP dùng D1 với alias, normalized text và FTS/keyword. Chỉ bổ sung embedding khi:

- tập đánh giá chứng minh keyword/FTS không đạt recall mục tiêu;
- có quy trình re-index/version embedding;
- vẫn bảo đảm citation gắn từ record đã kiểm duyệt;
- chi phí và độ trễ được đo.

#### 7.3.1 US-025 slice 1 — ranked provision candidates

`lib/legal-evidence-retriever.ts` triển khai candidate foundation cô lập, chưa
phải production retriever và chưa tạo `validatedEvidenceBundle`.

Repository query chỉ đọc relational graph:

```text
legal_entries(status=published)
  → legal_entry_citations
  → legal_provisions(status=published)
  → legal_sources(status=in_force)
```

Query không đọc `legal_basis`, `penalty`, `remedy` hoặc `case_study` legacy làm
legal evidence. Answer title/topic/tags chỉ là ranking signal. Defense in depth
ở application layer kiểm lại:

- answer, citation relation và provision phải có four-eyes metadata;
- source phải `in_force`, verifier khác creator, official HTTPS URL/authority
  hợp lệ và còn hiệu lực tại injected `asOf`;
- provision phải có active effectivity window, revision ID và checksum;
- review/verification timestamp không được nằm trong tương lai;
- freshness policy phải có version, PM và internal content reviewer khác nhau,
  ngày duyệt hợp lệ và exact-host rule;
- không có policy/rule hoặc quá TTL đã duyệt thì loại candidate.

Schema hiện tại không có review attribution trên `legal_entries` và
`legal_entry_citations`; `legal_provisions` cũng chưa có revision, checksum hay
effectivity window. D1 mapper vì vậy gắn:

```text
answer/link review = legacy_unverified
provision revision/effectivity = unverified
```

Kết quả join hiện tại luôn bị loại trước ranking. Đây là fail-closed gate có chủ
ý, không phải corpus đã sẵn sàng.

Freshness/ranking policy và clock được inject khi construct service, không nhận
từ end-user request và không có production default trong code. Policy được
`structuredClone` rồi deep-freeze tại construction boundary để caller không thể
thay nội dung mà vẫn giữ nguyên version trong một service instance. Các số trong
test chỉ là fixture, không phải TTL/threshold đã được duyệt.

Lexical ranker:

- normalize Unicode và tiếng Việt có/không dấu;
- exact-token match, không substring;
- deduplicate query term và giới hạn query/term/candidate count;
- integer field weights, minimum score/matched terms và top-k đều bounded;
- eligibility chạy trước scoring;
- sort ổn định theo score, matched-term count, answer ID rồi provision ID;
- D1 đọc `candidateLimit + 1`; nếu còn row ngoài giới hạn thì fail closed thay vì
  rank một prefix theo ID;
- group theo provision/source/revision; duplicate chỉ được gộp khi toàn bộ
  canonical provision/source fingerprint giống nhau, nếu không fail closed;
- chọn ranking signal tốt nhất cho mỗi canonical revision trước top-k;
- output chỉ là `RankedProvisionCandidate` có candidate ID, score/reasons,
  config/policy version và `asOf`.

Internal unavailable codes:

```text
INVALID_QUERY | MISSING_FRESHNESS_POLICY | INVALID_FRESHNESS_POLICY
MISSING_RANKING_POLICY | INVALID_RANKING_POLICY
CANDIDATE_SCAN_OVERFLOW | CANDIDATE_CONFLICT
NO_ELIGIBLE_CANDIDATES | BELOW_THRESHOLD | DEPENDENCY_ERROR
```

Không import candidate foundation trong `/api/chat`, không import OpenAI
adapter, không có FTS/index migration và không thay public API contract. Không
log raw question/candidate text; nếu bổ sung telemetry chỉ ghi IDs, score/reason,
policy/config version, latency và result code.

### 7.4 Ingestion lane

```text
official API/export or allowlisted HTML/PDF
  → fetch guard
  → raw snapshot/quarantine
  → deterministic parse + checksum + dedupe
  → optional AI extraction/classification
  → draft
  → pending_review
  → four-eyes publish
  → FTS/index
```

- Ưu tiên API/export có tài liệu, version, quota và terms rõ ràng.
- Không gọi hoặc reverse-engineer endpoint nội bộ chưa được công bố như API ổn
  định.
- AI extraction là untrusted draft; không xác nhận hiệu lực hoặc publish.
- End-user request không chạy ingestion hoặc live web search.
- Data contract, kết quả đánh giá nguồn và go/no-go gate nằm tại
  `docs/THIRD_PARTY_DATA_ASSESSMENT.md`.

### 7.5 Job state và idempotency

Fetch/parse job dùng state:

```text
queued → fetching → fetched → parsing → validating → candidate_created
       → completed
```

Nhánh no-op: `completed_no_change`. Nhánh lỗi: `partial_failed`, `failed`,
`cancelled`; giữ `retry_count`, cursor, counts, `error_code`, `trace_id`,
requester và timestamps. Raw document dùng state
`discovered → fetched → unchanged|changed → parsed →
rejected|quarantined|candidate_created`.

Human review là state machine riêng trên candidate:
`draft → pending_review → approved|rejected`. Approval transaction tạo revision
published-eligible và audit event. Index job riêng dùng
`queued → indexing → completed|failed`, idempotent theo revision/checksum.

Idempotency key:
`(provider, external_id, source_version_or_checksum)`.

### 7.6 OpenAI provider contract

- Backoffice discovery có thể dùng Responses API `web_search` với
  `allowed_domains` official và yêu cầu complete sources; kết quả chỉ tạo
  candidate.
- Extraction/composition dùng Structured Outputs theo JSON Schema.
- Runtime composer chỉ nhận sanitized question + validated evidence bundle.
- Model chỉ trả evidence IDs; server lấy citation/URL/mức xử lý từ D1.
- Missing key, timeout, invalid schema hoặc unknown evidence ID fail closed.
- `OPENAI_API_KEY` là secret server-only; `OPENAI_MODEL` và feature flags là
  configuration. Không dùng biến `NEXT_PUBLIC_*` cho provider secret.
- Config contract dự kiến trong `.env.example`:
  `AI_REPHRASE_ENABLED=false`, `AI_WEB_SEARCH_ENABLED=false`,
  `AI_PROVIDER_TIMEOUT_MS`, `AI_PROVIDER_MAX_REQUESTS_PER_MINUTE`.
- Ingestion config dự kiến:
  `INGESTION_ENABLED=false`, `SOURCE_PROVIDER_BASE_URL`,
  `SOURCE_PROVIDER_API_KEY`, `SOURCE_FETCH_USER_AGENT`,
  `INGESTION_TIMEOUT_MS`, `INGESTION_MAX_DOC_BYTES` và `CRON_SECRET` nếu dùng
  HTTP-trigger nội bộ. Base URL phải khớp source registry đã duyệt và không mở
  rộng allowlist.
- `DB`, `RAW_DOCUMENTS`, `INGESTION_QUEUE`, `INGESTION_DLQ` là Cloudflare
  bindings, không phải `.env` values.
- URL do web search trả về phải canonicalize, refetch và qua exact
  allowlist/authority guard của DEC-004; provider domain filter không thay thế
  server validation.

### 7.7 Lát cắt delivery hiện tại — adapter evidence-only

`lib/openai-evidence.ts` là adapter server-side độc lập, chưa được import bởi
`/api/chat`. Boundary này là có chủ ý: chat chỉ được nối sau khi US-025 tạo
evidence bundle từ D1 và server có thể gắn citation/sanction canonical.

Adapter chỉ gọi cố định `POST https://api.openai.com/v1/responses` bằng native
`fetch`, `store: false`, không khai báo tool/web search và không cho cấu hình
base URL. `AI_REPHRASE_ENABLED` chỉ bật khi giá trị đúng chính xác `true`;
nhánh disabled return trước provider call. Model allowlist hiện chỉ có
`gpt-5.6-sol`; `OPENAI_MODEL` rỗng dùng giá trị này. Thay model phải qua
code/config review có kiểm thử, không nhận tên model tùy ý từ env.

Evidence đầu vào phải thỏa toàn bộ invariant:

- provision `published`, source `in_force`, freshness evaluator trả `valid`;
- `provision_created_by != provision_reviewed_by`;
- `source_created_by != source_verified_by`;
- có review/verification timestamp ISO UTC và `freshness_policy_version`;
- source/provision ID là số nguyên dương, evidence ID unique/bounded;
- có `allowedClaims`; text/claims/array count đều bị giới hạn kích thước.

Provider chỉ nhận:

```ts
type ProviderEvidenceInput = {
  question: string; // NFC, bỏ control character, collapse whitespace
  evidence: Array<{
    evidenceId: string;
    text: string;
    allowedClaims: string[];
  }>;
};
```

Source/provision ID, reviewer metadata, URL và sanction không được gửi sang
model. Question và evidence được đặt trong JSON data; instruction cố định của
server coi chúng là untrusted và cấm thực hiện instruction nằm bên trong.

Structured Output nội bộ:

```ts
type EvidenceLinkedText = {
  text: string;
  evidenceIds: string[];
};

type EvidenceComposition = {
  conclusion: EvidenceLinkedText;
  explanation: EvidenceLinkedText[];
  examples: Array<{
    title: string;
    scenario: string;
    outcome: string;
    evidenceIds: string[];
  }>;
  recommendedActions: EvidenceLinkedText[];
  warnings: EvidenceLinkedText[];
};
```

JSON Schema đặt `additionalProperties: false` ở mọi object, required mọi field,
giới hạn array/string và tạo `enum` evidence ID động từ bundle hiện tại. Server
parse/validate lại shape, field thừa, duplicate/unknown ID sau khi nhận response.
Output nội bộ không có citation, URL, document metadata hoặc sanction.

Numeric policy hiện tại là **model prose không được chứa chữ số**.
Điều/khoản, ngày, độ tuổi và mức tiền sẽ do server render từ canonical
predicate/sanction record trong lát cắt sau. Cách này tránh sai khác biểu diễn
như dấu chấm/phẩy hoặc khoảng tiền. Semantic entailment giữa prose và
`allowedClaims` chưa được tự động chứng minh; adapter chưa được bật trong chat
cho tới khi có evidence-span/predicate validation và golden-set evaluation.

Failure taxonomy không chứa provider body, question, evidence hoặc secret:

```text
DISABLED | MISSING_API_KEY | INVALID_CONFIG | INVALID_REQUEST
INVALID_EVIDENCE | PROVIDER_TIMEOUT | PROVIDER_ERROR | PROVIDER_REFUSAL
INVALID_OUTPUT | UNKNOWN_EVIDENCE_ID | NUMERIC_MISMATCH
```

Response `incomplete`, refusal, nhiều hơn một `output_text`, malformed JSON,
response quá kích thước, HTTP/network error và timeout đều fail closed. Success
chỉ trả composition đã validate cùng `responseId`, model và token usage cho lớp
telemetry phía trên. Adapter không retry mặc định để tránh double cost.

`tests/openai-evidence.test.mjs` bao phủ success, request contract, strict flag,
missing/invalid config, caller-provided eligibility/four-eyes metadata,
request-envelope defense với chuỗi prompt injection,
unknown/duplicate ID, numeric/citation smuggling, malformed/incomplete/refusal,
HTTP/network/timeout và static no-chat-integration; kết quả hiện tại 15/15 pass.

Chưa triển khai: caller fallback curated/unavailable, D1 citation assembly,
rate limit/quota/circuit breaker, cost aggregation, semantic claim-span
evaluator, canonical provenance/relationship verification và production
telemetry.

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
- Fetcher chặn SSRF, redirect ra ngoài allowlist, private IP, MIME không hỗ trợ
  và file quá kích thước.
- URL parser từ chối userinfo, port ngoài policy và IP literal; resolve/pin
  public IP cho mỗi hop, re-check mọi redirect để chống DNS rebinding.
- Giới hạn compressed/decompressed bytes, page count, parser CPU/memory/time;
  parser PDF/HTML chạy trong trust boundary tối thiểu và có fixture
  malware/polyglot/decompression bomb.
- Source text được coi là untrusted data, không phải instruction cho model.
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

### Phase 2 — Draft backfill và review packet

- Map từng `legal_entry` sang answer/source/provision/example ở trạng thái draft.
- Không tự động coi text cũ là nguồn đã xác minh.
- Chuẩn bị review packet gồm official URL, raw snapshot/diff,
  điều/khoản/điểm, hiệu lực và mức xử lý; chưa approve/publish ở phase này.
- Ghi báo cáo record không backfill được hoặc bị trùng.
- Source ngoài đi qua registry/spike trước; ingestion chỉ tạo draft và không
  được chen ngang workflow review.

### Phase 3 — CMS workflow và corpus readiness

- Bật `pending_review`, revision, reviewer và audit.
- Chuyển quyền publish từ workflow cũ.
- Đóng đường publish không có citation.
- Reviewer khác editor xác nhận review packet; hoàn tất
  source/provision/sanction backfill và review bốn mắt.
- Không đưa legacy `published` vào RAG chỉ dựa trên status cũ.

### Phase 4 — Dual read / shadow evaluation

- Retrieval mới chạy shadow, không ảnh hưởng response người dùng.
- So sánh result cũ/mới trên tập câu hỏi chuẩn.
- Theo dõi latency, match quality, citation validity và unavailable rate.
- Không ghi song song nếu chưa có idempotency và consistency strategy rõ ràng.
- Adapter US-026 có thể được xây/test cô lập với fixture evidence trước phase
  này, nhưng không được nối request path. Chỉ shadow-call sau khi validated
  bundle và output guard có evidence.

### Phase 5 — API v1 và frontend cutover

- Ra `/api/v1/legal-answers`.
- Frontend render từng phần và link citation rõ ràng.
- Feature flag cho phép quay về `/api/chat`.
- Canary rollout, theo dõi error/latency và feedback.

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
- **DEC-005:** sản phẩm là RAG-first. MVP retrieve corpus đã
  reviewed/published/effective bằng structured search/alias/FTS5 trước khi model
  compose; vector database không bắt buộc. Không có evidence thì
  `unavailable`.
- **DEC-006:** dữ liệu ngoài chỉ vào staging/draft có provenance, checksum,
  allowlist và four-eyes. AI chỉ discovery/extraction draft hoặc evidence-bound
  composer; không auto-publish, không live-search cho end user và không dùng
  kiến thức mở làm fallback.
### Điểm còn mở

Các điểm cần product/technical owner chốt trước Sprint 1:

1. `last_verified_at` quá bao lâu thì nội dung phải review lại?
2. MVP có cần phân biệt mức áp dụng theo độ tuổi ngay trong data model không?
3. Duyệt initial latency gate ở mục 7.2 và chốt availability SLO là bao nhiêu?
4. Có lưu câu hỏi ẩn danh để cải thiện retrieval không; nếu có, retention và cơ
   chế loại dữ liệu cá nhân là gì?
5. Duyệt hay từ chối **PROP-001**: giữ public/admin/query trong Worker hiện tại
   và tách scheduled/batch ingestion thành Worker riêng?
