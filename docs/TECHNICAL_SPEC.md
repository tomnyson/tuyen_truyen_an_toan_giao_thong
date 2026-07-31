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
| Data layer | Drizzle ORM trên Cloudflare D1; citation/reviewed-RAG bridge đã có schema nhưng chưa nối read/write API | `db/`, `drizzle/0001_citation_foundation.sql`, `drizzle/0002_reviewed_rag_bridge.sql` |
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

`readiness=green` không được tin từ một cột/body đơn lẻ. Durable implementation
phải bind exact registry revision vào editorial subject/revision hoặc bảng
approval append-only tương đương, có một quyết định `approve` của PM và một của
internal content reviewer; hai approver khác nhau và đều khác registrant.
Revoke/terms change tạo revision mới, làm approval cũ stale và khiến job mới
fail closed. `reviewed_by` trên registry chỉ là metadata tiện đọc, không thay
thế hai approval records.

Delivery foundation hiện tại là static registry tại `lib/source-registry.ts`
và chưa thay thế bảng durable phía trên. Nó ghi ba nguồn Chính phủ đã biết với
đủ contract field; mọi nguồn giữ `yellow`, không có API/terms approval nào bị
suy diễn. Validator chặn userinfo, custom port, IP literal, host ngoài DEC-004,
export endpoint ngoài allowlist và luôn từ chối `green`. Readiness `green` chỉ
có thể được bổ sung sau bằng authenticated PM + independent internal content
reviewer workflow có durable approval/audit.

Production job phải resolve source, endpoint, allowed hosts, quota, retention
và policy version từ durable registry ở server; request/job payload chỉ mang
stable registry ID và input/cursor đã được schema-validate. Job fail closed
trước outbound fetch nếu source không active/green, approval bị revoke, terms
hoặc retention chưa được duyệt. Static/yellow registry chỉ hợp lệ cho local
feasibility spike và không được scheduler/queue production consume.

Feasibility sample `fixtures/source-registry/vbpl-nd168.sample.json` giữ exact
full-text URL, metadata URL, upstream ID, timestamp, section anchor và checksum.
Mapper chỉ nhận exact canonical `official/yellow/conditional_go` registry
record và chỉ tạo source/provision `draft` chưa verified/reviewed. Nó không ghi
D1, không fetch raw file, không index và không publish.

US-024 local-safe slice tại `lib/ingestion-local.ts` chỉ tạo feasibility plan
thuần từ exact request bốn field
`{mode, providerKey, sampleRef, createdBy}`. Caller không truyền fixture,
policy/registry/credential/URL/limit. Planner resolve canonical static registry
và manifest server-side; exact sample ref bind tới JSON artifact được static
import từ repository. Chỉ record `official/yellow/conditional_go` có sample ref
khớp mới được dùng.

Request được copy thành primitive snapshot; committed fixture được validate,
copy toàn bộ field/nested field và deep-freeze trước `await` đầu tiên. Mapper
không giữ caller-owned mutable object qua async boundary. Idempotency v2 là
SHA-256 trên canonical ordered field-name/value components có 4-byte big-endian
UTF-8 length prefix, gồm policy, provider, sample ref và **mọi** field fixture;
nullable field có type marker để không collision. `createdBy` không thuộc
content identity, nên cùng artifact từ actor khác giữ cùng key dù draft output
ghi đúng actor.

Output được deep-freeze, chỉ có draft mapping, `persistence=none`,
`rawSnapshotRef=null`; lỗi dùng stable code/message và không echo input/cause.
Slice không có runtime file API/network/env, route/migration/fetch/D1/R2/Queue
hay AI và không chứng minh production ingestion/deduplication. Static yellow
source vẫn bị cấm trong production lane; mọi durable green-source, trusted
trigger, raw store, queue, quarantine, four-eyes và rollout gate bên dưới tiếp
tục bắt buộc.

`ingestion_jobs`

- `id`, `source_registry_id` FK, job type, cursor, status;
- `requested_by`, schedule/operation ID, policy version, attempt/lease version,
  counts, `error_code`, `trace_id`, timestamps.
- Job fetch/parse kết thúc ở `completed`, `partial_failed`, `failed` hoặc
  `cancelled`; human review không giữ ingestion job mở.
- Claim/renew/complete dùng lease hoặc compare-and-swap trên state/version;
  queue redelivery và worker crash không cho hai consumer cùng commit một bước.

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
legal hold. Trước parse/review, service kiểm tra chéo D1 checksum/byte count/MIME
với exact immutable R2 object metadata; mismatch bị quarantine, không tự sửa
metadata. Delete/tombstone raw object là privileged audited operation và không
được chạy khi còn published revision hoặc legal hold tham chiếu.
Object key phải content-addressed hoặc chứa immutable version/checksum; upload
dùng conditional create, không overwrite một key cũ. Nếu key đã tồn tại nhưng
metadata/checksum khác, job fail closed và quarantine thay vì thay object.

`ingestion_candidates`

- `id`, `raw_document_id` FK, target entity type, candidate JSON;
- `candidate_sha256`, extraction/parser version, status;
- `editor_id`, `reviewer_id`, review result/note, timestamps;
- unique (`raw_document_id`, `candidate_sha256`, target entity type).

Candidate được promote bằng transaction tạo source/provision revision và audit
event; reviewer phải khác editor. Reject là terminal cho candidate revision,
không xóa raw provenance.

Mỗi candidate/revision bind exact `raw_sha256`, raw object version, parser
version, extractor/model policy version và section/page anchor. Upstream
update/supersede/delete không sửa candidate/revision cũ: tạo raw version hoặc
tombstone mới, invalidate graph/index phụ thuộc và đưa content về review.

`legal_search_fts` là FTS5 virtual table chỉ chứa text của revision đủ điều kiện
index và stable IDs về answer/provision/source. Migration phải tạo trigger hoặc
explicit indexer có test rebuild; FTS không phải source of truth.

Các bảng trên dùng expand-only migration. Trước activation phải test
backup/restore D1, R2 access/retention, unique/idempotency và rebuild FTS từ
canonical tables.

### 5.9 Editorial workflow sidecar — delivery slice 3

Migration `0003` là expand-only và độc lập nhà cung cấp danh tính. Nó không
backfill actor, không tạo credential, không sửa status của graph 0002 và không
tự coi dữ liệu legacy là đã duyệt.

Các trust primitive tối thiểu:

- `editorial_principals`: stable actor ID, external subject nullable, display
  name và trạng thái `active|disabled`;
- `editorial_role_grants`: role `editor|reviewer|admin`, người/thời điểm cấp và
  thu hồi; role grant chỉ có hiệu lực khi principal active và chưa bị revoke;
- `editorial_subjects`: stable subject ID, entity type/key, creator, lifecycle,
  current revision và optimistic version;
- `editorial_revisions`: canonical snapshot JSON + SHA-256, version và creator;
- `editorial_review_requests`: bind subject, exact revision và submitter;
- `editorial_review_decisions`: append-only approve/reject, reviewer và lý do;
- `editorial_audit_events`: operation ID idempotent, actor/role snapshot,
  subject/revision/request, action, before/after state/hash và metadata tối
  thiểu.

Database invariant:

- revision, decision và audit event là append-only; trigger từ chối
  `UPDATE`/`DELETE`;
- một revision chỉ có tối đa một quyết định và một subject chỉ có tối đa một
  request đang mở;
- request phải trỏ current revision của subject;
- decision chỉ hợp lệ khi principal đang active, có grant
  `reviewer|admin`, khác creator/revision creator/submitter và request còn mở;
- reject bắt buộc lý do; approve/reject dùng database time;
- operation ID unique để retry không tạo audit trùng;
- principal/role ID từ body client không phải bằng chứng xác thực. Runtime
  service tương lai phải resolve actor từ opaque/revocable session và kiểm role
  hiện hành ở database.

Slice 3 chỉ chứng minh schema trust primitives và constraint bằng SQLite/D1
fixture. Subject mới bắt buộc creator active có role `editor|admin`, trạng thái
`draft`, chưa có current revision và optimistic version bằng 0. Revision chỉ do
creator active tạo liên tục khi subject còn draft. Current revision, lifecycle
và version chỉ thay đổi theo transition có request/decision tương ứng; direct
pending/published revision swap bị từ chối.

Grant đầu tiên chỉ được bootstrap một self-admin khi grant table rỗng. Các grant
sau do active admin cấp; revoke dùng database time, một chiều và không được xóa
lịch sử. Principal đã disabled không thể re-enable; identity đã bind không thể
rebind. Audit chỉ được tạo khi actor có live role và action/binding khớp chính
xác request/decision hiện có; revision, decision và audit là immutable.

Evidence: `drizzle/0003_editorial_trust_primitives.sql`, `db/schema.ts`,
`tests/editorial-workflow-schema.test.mjs` 13/13 pass, full suite 76/76 pass,
TypeScript/ESLint/build pass và final review không còn blocker/high/medium.

Slice này chưa tạo authenticated workflow runtime, chưa promote
source/provision/entry/citation, chưa khóa legacy CMS direct publish/delete và
chưa nối retriever. SHA-256 snapshot mới được kiểm shape ở database; runtime
tương lai phải canonicalize và tự recompute digest. Các phần đó là activation
gate riêng.

### 5.10 Public catalog identity, showcase projection và dedup

US-017 dùng `content_key` bất biến làm identity xuyên static catalog, D1,
public API, page và chat. Format:

```text
law:<lowercase-ascii-slug>
showcase:<lowercase-ascii-slug>
```

Key tối đa 96 ký tự, match
`^(law|showcase):[a-z0-9]+(?:-[a-z0-9]+)*$`, được khai báo trong fixture/migration
hoặc editor command và không regenerate từ title ở read path. D1 có unique
constraint theo key; public DTO không dùng offset ID hoặc array index làm
identity.

Repository phải trả một dependency snapshot có discriminated union, không dùng
`[]` cho cả success và lỗi:

```ts
type CatalogDependencySnapshot<T> =
  | {
      state: "available_records";
      records: readonly T[];
      suppressions: readonly ReviewedSuppression[];
    }
  | {
      state: "available_empty";
      records: readonly [];
      suppressions: readonly ReviewedSuppression[];
    }
  | {
      state: "unavailable";
      reason:
        | "missing_binding"
        | "schema_unavailable"
        | "query_failed"
        | "invalid_snapshot";
    };
```

`available_empty` chỉ nói managed query thành công và không có managed record;
nó không có nghĩa public catalog phải rỗng. Resolver vẫn dùng static baseline đã
lọc và trừ suppression, trả `dataState=ready`. Đây là normal overlay, không phải
fallback. `unavailable` mới dùng static degraded fallback và reviewed
suppression snapshot độc lập với D1.

Resolver thuần, versioned nhận static records có explicit key/eligibility,
dependency snapshot và fallback suppression snapshot. Kết quả:

- `available_records`: managed `published` cùng key thay static, managed-only
  key hợp lệ được thêm như content mới;
- `available_empty`: trả static baseline eligible trừ suppression;
- draft/pending-review không che static;
- suppression/block/invalidation không làm static cũ xuất hiện lại;
- `unavailable`: dùng static eligible trừ fallback suppression snapshot và gắn
  `dataState=degraded`; snapshot thiếu, sai required version/hash hoặc không bind
  deployed catalog version thì fail closed về mảng rỗng;
- duplicate/collision hoặc backfill orphan fail closed với stable reason, không
  chọn theo `updated_at`;
- sort theo topic, explicit display order rồi content key.

`orphan` chỉ thuộc migration/backfill validation: một legacy/static key được
khai báo phải migrate nhưng thiếu/sai mapping, hoặc mapping trỏ target không tồn
tại/sai entity. Một managed-only record có valid unique key là content mới và
không phải orphan.

Resolver là owner duy nhất của merge. `app/page.tsx`, public content route và
chat chỉ consume kết quả đã resolve; không được nối
`[...managedRecords, ...staticRecords]`.

Public API shape cho cả ready/degraded:

```ts
type PublicCatalogResponse = {
  dataState: "ready" | "degraded";
  resolverPolicyVersion: string;
  laws: PublicLaw[];
  showcases: PublicShowcase[];
};
```

Degraded response là HTTP `200`, cùng `X-Request-ID`, không có raw dependency
reason và bắt buộc `Cache-Control: no-store`. Lý do stable chỉ đi telemetry.
Ready response có thể cache theo policy riêng. Health/alert không được suy
database khỏe chỉ từ status 200; phải dùng `dataState`/telemetry.

Trước US-017, public content API của US-005 vẫn dùng `503`/no-store khi D1 lỗi
vì chưa có resolver/suppression-safe fallback. DEC-008 chỉ activate khi resolver
và suppression snapshot cùng được nối; khi đó API + exact client DTO + tests
chuyển atomically sang shape `PublicCatalogResponse` và degraded `200`. Không
đổi status sớm khi fallback còn có thể làm content suppressed hồi sinh.

Public showcase projection tối thiểu:

```ts
type PublicShowcase = {
  contentKey: `showcase:${string}`;
  topic: "Giao thông" | "Mạng xã hội" | "Sở hữu trí tuệ";
  title: string;
  summary: string;
  sourceUrl: string;
};
```

Chỉ project showcase published có field bắt buộc không rỗng và `sourceUrl`
HTTPS qua exact authority policy DEC-004. API order là deterministic và UI render
toàn bộ mảng, không đọc hai index cố định. UI state tách
`loading|ready|empty|degraded|error`; detail dialog giữ full summary/topic/source,
đóng bằng button/Escape và quản lý focus.

**US-005 transitional implementation (2026-07-31):** trước khi US-017 cung cấp
canonical resolver/content key, public DTO dùng positive integer `id` hiện có
của D1 làm stable identity trong một response. Route query `published` theo
`updatedAt DESC, id DESC`; `lib/public-showcase.ts` revalidate field/topic,
exact HTTPS authority DEC-004 và giữ nguyên input/API order. Dependency failure
trả `503` với stable error code và `Cache-Control: no-store`, khác với
success-empty.

`components/ShowcaseGallery.tsx` chỉ consume mảng đã project, render toàn bộ
item theo ID và không tự merge static/managed. UI tách
`loading|ready|empty|degraded`; dialog hiển thị đúng full
topic/title/summary/source, đóng bằng button/Escape, có minimal focus trap,
initial focus và return focus. Client parser chỉ nhận exact public DTO, không tự
nâng `status`/eligibility field; focus trap kéo focus bị thoát trở lại dialog.
`tests/public-showcase.test.mjs` pass **15/15**;
full suite **198/198**, typecheck, lint và build pass. Đây không phải
implementation của US-017: resolver sau này thay `id` bằng `contentKey` và thêm
override/suppression/degraded fallback nhưng giữ renderer contract.

Migration US-017 phải expand-only: thêm key nullable, backfill bằng review packet
tường minh, báo collision/orphan, sau đó mới enforce uniqueness/not-null cho
record được activate. Không auto-map theo normalized title. Một suppression
durable là append-only tombstone bind exact content key/revision/catalog
version, actor, reason, reviewer/decision và audit. Archive content từng
published/keyed phải tạo suppression tombstone để static không hồi sinh; khôi
phục static cần một reviewed restore decision mới. Key không được tái sử dụng.
Không hard-delete content từng published/keyed; hard-delete chỉ cho draft chưa
được cấp key, chưa từng publish, không reference/citation và vẫn ghi audit.

Fallback suppression snapshot là export đã review của tombstone ledger, bind
resolver policy + deployed static catalog version và được đóng gói/activate cùng
artifact. Nếu snapshot không verify đúng required version/hash, degraded resolver
trả mảng rỗng. Không được bỏ suppression chỉ vì D1 unavailable.

Local slice trước migration chỉ triển khai pure resolver, DTO/degraded response
factory và fixture tests cho ba snapshot, managed-only key, orphan, suppression
và no-resurrection. Slice này không ghi D1, không tạo migration và không đủ để
check production activation. Production gate riêng yêu cầu expand-only
migration, authenticated reviewed backfill/suppression ledger, signed hoặc
MAC-verified fallback export, actual D1 apply-before-code, dual-read shadow,
collision/orphan report, fallback snapshot activation, restore/rollback và API
smoke.

**US-017 local implementation (2026-07-31):**
`lib/catalog-resolver.ts` triển khai `catalog-resolver-v1` thuần và immutable.
Resolver validate exact key/prefix/field, ba dependency state, static
eligibility, managed override/managed-only, draft/pending isolation và
topic/display-order/content-key sort. Duplicate static/managed/suppression,
many-to-one backfill, true orphan và mọi managed record có
`eligibility != eligible` thiếu matching tombstone đều fail closed bằng stable
internal code; khi tombstone tồn tại thì record bị ẩn bất kể
draft/pending/published/archived.

Fallback suppression snapshot bind exact resolver policy, deployed static
catalog version, required snapshot version, hai actor label khác nhau về mặt
cấu trúc, review/expiry window và SHA-256 canonical payload. SHA-256 không khóa
chỉ chứng minh payload không đổi so với digest được cung cấp; local slice không
xác thực actor, review decision hoặc nguồn gốc digest và không được claim
four-eyes. Snapshot thiếu, stale/same-actor-label/version/catalog/hash mismatch
trả empty degraded. Resolver snapshot dependency discriminator, `asOf`, version
và mọi fallback field trước async hash boundary; malformed record/mapping không
thể làm throw.
`createPublicCatalogHttpResponse` tạo exact public DTO HTTP `200`, giữ request ID
và map mọi internal `failed_closed` thành public `dataState=degraded` +
`Cache-Control: no-store` mà không lộ reason/issues, nhưng factory **chưa được
nối** vào route/page/chat. Fixture/test local tại
`fixtures/catalog/static-catalog.v1.json` và
`tests/catalog-resolver.test.mjs` pass 20/20; full suite 198/198, typecheck,
lint và build pass. Không có authenticated reviewed ledger/export signature,
migration, backfill, D1 activation hoặc consumer parity trong slice này.

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
- `DEPENDENCY_UNAVAILABLE` — `503`

Không trả stack trace, provider response hoặc secret cho client.

### 6.3 Tương thích API

Trong rollout, `/api/chat` tiếp tục trả contract cũ. Endpoint v1 mới chạy song
song; frontend chuyển sang v1 sau khi có test và telemetry. Chỉ xóa contract cũ
khi đã có deprecation window và xác nhận không còn consumer.

### 6.4 US-004 local delivery contract và dependency gate

`POST /api/v1/legal-answers` là endpoint versioned; không đổi shape
`/api/chat` tại chỗ. Request v1 chỉ dùng current `question` làm retrieval input.
Conversation do client gửi là untrusted display context, được bound/sanitize và
không được coi là evidence hoặc instruction.
`requestId` trong body và `X-Request-ID` phải là cùng UUID v4 do outer Worker
tạo; provider response ID không được dùng làm application correlation ID.

Server dựng `LegalAnswerResponse` từ object có cấu trúc, không split/parse chuỗi
legacy. `curated|ai_assisted` yêu cầu:

- canonical answer key đã qua resolver US-017;
- ít nhất một citation bind exact provision/source revision hợp lệ;
- ít nhất một example bind cùng answer revision;
- sanctions/numeric/date/article field lấy từ canonical D1 record;
- mọi ID unique, nằm trong validated bundle và khớp response;
- response qua schema validator trước khi gửi.

Thiếu một invariant trả HTTP success với `mode=unavailable`, `confidence=low`,
answer an toàn và arrays rỗng; malformed request vẫn là `400`. Provider
timeout/invalid output sau retrieval dùng curated fallback nếu bundle tự đủ,
nếu không trả `unavailable`. Core storage/config/rate-limit failure trước khi
có validated bundle dùng error contract `503`/`429` riêng và không biến thành
kết luận pháp lý.

Frontend render section theo field, text-escape mặc định, không inject HTML.
Citation link chỉ dùng URL HTTPS đã validate và có accessible label. Loading,
error và unavailable là ba state khác nhau. Cutover dùng feature flag; rollback
chỉ đổi frontend về `/api/chat`, không hạ validation v1.

Dependency:

1. US-017 cung cấp canonical content key/resolver.
2. US-003/US-015 cung cấp source/provision/citation graph.
3. US-025 cung cấp validated evidence bundle.
4. US-008/US-026 chỉ cần cho `ai_assisted`; `curated` không phụ thuộc API key.
5. US-020 nhận structured IDs/provider metadata sau khi v1 integration pass.

Local implementation/test không cần production credential: dùng D1 fixture có
reviewed graph và provider fixture inject. Tuy nhiên fixture riêng hoặc text
legacy không đủ để check AC integration; contract, API, frontend và negative
paths phải cùng pass.

### 6.5 Presentation contract cho câu trả lời chat

US-004 sở hữu presentation contract; US-003 sở hữu citation label/link và
US-027 sở hữu nhãn rủi ro của `web_search`. UI không được coi chuỗi
`/api/chat.answer` legacy là Markdown, HTML hay nguồn để suy ra citation.
Presentation model đích được dựng từ response có cấu trúc:

```ts
type ChatPresentation =
  | {
      state: "answered";
      mode: "curated" | "ai_assisted";
      warnings: string[];
      conclusion: string;
      explanation: string;
      examples: Array<{ title: string; scenario: string; outcome: string }>;
      recommendedActions: string[];
      legalRemedies: Array<{
        summary: string;
        sanctionId: number;
        provisionId: number;
      }>;
      sanctions: Array<{
        sanctionId: number;
        provisionId: number;
        measureType: "fine" | "warning" | "remedy" | "other";
        summary: string;
        amountMin: number | null;
        amountMax: number | null;
        currency: "VND" | null;
        subjectType: string;
        ageMin: number | null;
        ageMax: number | null;
        applicabilityConditions: string[];
      }>;
      citations: LegalCitation[];
    }
  | {
      state: "web_search";
      mode: "web_search";
      warning: string;
      conclusion: string;
      explanation: string;
      sources: OfficialSourceLink[];
    }
  | {
      state: "unavailable";
      mode: "unavailable";
      title: string;
      message: string;
      nextActions: string[];
    }
  | {
      state: "error";
      title: string;
      retryable: boolean;
      requestId?: string;
    };
```

`web_search` chỉ được thêm vào structured/v1 contract sau review riêng như
FR-04; type trên ghi presentation boundary cần đạt, không tự ý đổi public v1
mode trước review. Trong deprecation window, adapter legacy chỉ được map các
field tách riêng do server trả (`answer`, `warning`, `sources`, `mode`) sang
state tương ứng. Adapter không parse Markdown, không regex URL/căn cứ từ
`answer`, và không biến `429`/`503` hoặc `{error}` thành assistant message.

Quy tắc render:

1. Mode badge/cảnh báo bắt buộc xuất hiện trước nội dung. Với `web_search`, dùng
   nguyên semantic “Kết quả tra cứu tự động, chưa được kiểm duyệt nội dung” và
   không dùng từ “đã duyệt”, “đã xác minh” hoặc “RAG” cho kết quả đó.
2. Presentation answered-state dùng một thứ tự duy nhất: `Trả lời ngắn`
   → `Giải thích` → `Ví dụ dễ hiểu` → `Căn cứ pháp lý` → `Mức phạt tham khảo`
   → `Biện pháp khắc phục theo văn bản` → `Cách xử lý / việc nên làm`
   → `Điều cần lưu ý`. Kết luận là answer section đầu tiên và giới hạn 1–2 câu.
   Section optional rỗng không render.
3. Mọi text field được React/text renderer escape mặc định. Không dùng
   `dangerouslySetInnerHTML`; không để lộ literal Markdown/HTML/JSON. Nếu cần
   rich text về sau phải dùng schema component allowlist, không dùng arbitrary
   model Markdown.
4. Citation/source link chỉ lấy từ structured DTO đã qua server URL guard.
   Visible label ưu tiên `{tên hoặc số hiệu văn bản} — {điều/khoản/điểm}`;
   action name là “Mở nguồn chính thức”, đồng thời hiển thị official host.
   Link mở tab mới với `rel="noopener noreferrer"` và accessible name phải đủ
   để phân biệt nhiều nguồn.
   Citation card còn hiển thị `issuedAt`, `effectiveFrom`, optional
   `effectiveTo`, `lastVerifiedAt` từ canonical source/provision revision.
   Candidate revision mới bắt buộc có `issuedAt`. Snapshot published đời cũ
   thiếu field này vẫn được retrieval để tránh mất nội dung, nhưng citation đó
   không được dựng thành legal-basis card cho tới khi có revision mới đã duyệt.
   Production RAG chỉ nhận sanction từ `legal_sanctions` thuộc cùng validated
   evidence bundle. Trong giai đoạn chuyển tiếp, curated fixture chỉ được hiển
   thị sanction nếu có `reviewedSanction` riêng và citation có explicit
   article/clause/point đã qua four-eyes; tuyệt đối không parse từ `penalty`,
   `legalBasis` hoặc prose. Card hiển thị subject/age/vehicle/condition cạnh
   amount và luôn mang nhãn “tham khảo”.
5. `legalRemedies` là nghĩa vụ/biện pháp có sanction/provision ID;
   `recommendedActions` là hướng xử lý thực tế và an toàn. Hai nhóm render tách
   biệt. Text mang nghĩa vụ pháp lý nhưng không có evidence ID phải bị loại.
6. `unavailable` không render các section citation/sanction/conclusion pháp lý.
   Title/message nói rõ chưa đủ thông tin đã duyệt; `nextActions` có 1–2 lựa
   chọn an toàn như thu hẹp câu hỏi hoặc mở nguồn chính thức. Không lộ
   stack/provider/config. `error`, `loading` và `unavailable` là ba state DOM
   khác nhau.
7. Heading/landmark và thứ tự DOM phải theo đúng thứ tự đọc; warning có semantic
   note/status phù hợp, link và action điều khiển được bằng bàn phím. Nội dung
   phải wrap ở viewport 320 px mà không buộc cuộn ngang.

Direct `web_search` không được dùng official URL annotation như bằng chứng cho
mọi claim trong prose. Trước khi có claim/span validator và canonical graph
match, direct output chứa amount/currency, điều-khoản-điểm hoặc ngày pháp lý
phải fail closed; mode này chỉ được trả diễn giải không có các field pháp lý
canonical cùng danh sách source URL đã guard. Candidate draft chỉ được hiển thị
các field đó sau four-eyes review và server assembly từ source/provision/
sanction record.

Test gate trước cutover:

- component test xác nhận conclusion là answer section đầu tiên, thứ tự section
  ổn định và section optional rỗng bị bỏ;
- fixture chứa `**bold**`, heading, code fence, Markdown link, raw HTML và JSON
  không được tạo HTML thực thi hoặc lộ cú pháp thô trong nội dung người đọc;
- test 0/1/nhiều citation kiểm tra source DTO, label phân biệt được, URL HTTPS
  official, `target`/`rel` và không extract link từ answer;
- test `web_search` kiểm tra warning nằm trước answer, source-list label và
  không có reviewed badge; test `unavailable`, `{error}`, `429`, `503` kiểm tra
  bốn trạng thái không bị nhập làm một;
- accessibility test kiểm tra heading order, accessible link names, keyboard
  focus; responsive test kiểm tra nội dung tiếng Việt dài tại 320 px.

### 6.6 Topic scope và trust-tier presentation — US-029

`/api/chat` phải chạy `chat-topic-scope-v1` sau input validation và trước mọi
retrieval/search. Intent ảnh riêng tư có thể chạy trước topic gate để safety
guidance không bị chặn; nhánh này không retrieval, search hoặc persistence.
Classifier topic là pure deterministic function, normalize Unicode/tiếng Việt
và trả một trong:

```ts
type ChatTopic = "traffic" | "online_safety" | "copyright";
type ChatScopeDecision =
  | { inScope: true; topic: ChatTopic; policyVersion: "chat-topic-scope-v1" }
  | { inScope: false; topic: null; policyVersion: "chat-topic-scope-v1" };
```

Chỉ signal mạnh hoặc tổ hợp signal có ngữ cảnh được match. Các từ chung như
“ảnh”, “bài”, “xe”, “mạng” đứng một mình không đủ. Safety intent ảnh riêng tư
vẫn thuộc `online_safety`; dấu hiệu authorship/tác phẩm/giấy phép thuộc
`copyright`. Topic gate chỉ giới hạn phạm vi sản phẩm, không được coi là bằng
chứng pháp lý hoặc thay thế retrieval score.

Mapping legacy phải thu hẹp, không mở rộng phạm vi: `copyright` không được dùng
mọi record có topic rộng `Sở hữu trí tuệ`. Managed legacy path bỏ qua copyright
cho tới khi có subtype canonical; reviewed candidate chỉ đủ điều kiện khi topic
là `Sở hữu trí tuệ` và tags đã duyệt chứa `bản quyền`, `quyền tác giả` hoặc
`copyright`. Predicate subtype phải nằm trong SQL trước `LIMIT` và được kiểm tra
lại sau khi parse snapshot.

Nếu `inScope=false`, route trả `mode=unavailable` với đúng message sản phẩm,
không gọi managed/curated/reviewed retrieval, budget, OpenAI search hoặc
persistence. Nếu `inScope=true` nhưng toàn bộ nguồn không đủ điều kiện, route
trả no-match message ngắn, không có `sections`, `sources` hoặc legal claim.

Presentation chia theo trust tier:

1. Reviewed/published application data có thể dùng form đầy đủ, nhưng chỉ field
   map từ canonical reviewed records mới được dựng legal card.
2. Official live search chỉ dùng form direct-search đã guard; candidate chỉ
   được persist khi kết quả khai báo `sourceKind=official`, answer tự chứa
   signal đúng topic, có official URL và presentation hợp lệ. Tiêu đề source
   không được dùng để làm một answer chung chung trở thành đúng topic.
3. Reference live search là reduced form. Server chỉ giữ section
   `summary|details|next_steps|limitations`, loại mọi
   `legal_basis|sanctions|legal_remedies|examples`, luôn cảnh báo không chính
   thống/cần xác minh và không gọi persistence. Chỉ answer mang discriminant
   `answerOrigin=server_safe_fallback` do adapter tự gắn được phép không chứa
   topic signal; mọi `answerOrigin=provider` vẫn phải tự match topic đã phân
   loại trước khi hiển thị. Không suy ra nguồn gốc từ việc so sánh nội dung.
4. Out-of-scope/no-match/provider-invalid không dùng form trả lời pháp lý và
   không lưu.

Regression gate phải chứng minh: ba topic được đi tiếp; off-topic dừng trước
mọi dependency; Vietnamese có/không dấu; generic-token false positive; no-match
không có structured legal fields; reference projection không có legal section;
official result sai `sourceKind` không được lưu; reference không persist.

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

#### 7.1.1 Intent gate ảnh riêng tư và bản quyền — US-009

Classifier là hàm deterministic/versioned chạy trước managed/curated ranking,
normalize Unicode/tiếng Việt và match token/phrase boundary. Output nội bộ:

```ts
type ImageIntentDecision = {
  intent: "privacy_safety" | "copyright" | "unknown";
  reasons: Array<
    | "non_consensual_sharing"
    | "sensitive_image"
    | "peer_or_group_context"
    | "authorship"
    | "license_or_permission"
    | "attribution"
    | "ambiguous"
  >;
  policyVersion: string;
};
```

Policy:

- privacy/safety signals như phát tán không đồng thuận, ảnh riêng tư/nhạy cảm,
  bạn học/nhóm lớp có precedence khi câu mixed;
- copyright cần authorship/work/license/reuse/attribution signals;
- “hình ảnh” đơn lẻ hoặc score hòa không đủ điều kiện, trả `unknown`;
- retrieval chỉ rank record có intent tag khớp và đã qua eligibility; weak
  managed match không được override decision;
- copyright chưa có reviewed eligible record thì `unavailable`, không map sang
  privacy; privacy response không map sang copyright;
- privacy response không yêu cầu upload ảnh/danh tính/trường lớp và luôn gồm
  stop sharing, preserve evidence safely, tell a trusted adult/authority.

Test table phải có dấu/không dấu, positive/negative pair, mixed-risk,
ambiguous-token và nhiều managed candidate cạnh tranh. Test chỉ check routing và
safe action từ fixture eligible; không dùng prompt hoặc model để phân loại.

**Implementation (2026-07-31):**

- `lib/image-intent.ts` là policy source cho `image-intent-v2`; decision và
  reason list được freeze để caller không thể thay đổi kết quả sau phân loại.
- Classifier giữ cả normalized text có dấu và folded text: token `ảnh` có dấu là
  image subject; token `anh` không dấu chỉ là image khi nằm trong phrase ảnh
  đủ mạnh. Vì vậy các câu `Anh chưa xin phép lái xe`, `Anh chia sẻ ... nhóm
  lớp`, `Anh nóng tính` không kích hoạt safety/copyright.
- Folded sensitive phrase chỉ kích hoạt khi kèm passive risk, non-consent hoặc
  sharing; `hình|hinh` standalone chỉ là image subject khi kèm passive risk như
  `Hinh cua em bi phat tan`. `anh nong` không dấu cũng cần risk guard, nên
  `Anh nóng tính` vẫn là negative.
- Image subject đi với non-consent, passive dissemination hoặc bị lấy/sử dụng
  ưu tiên privacy. Classifier loại exact phrase `chưa/không xin phép tác giả`
  khỏi consent-risk text để giữ copyright, nhưng không dùng sự xuất hiện của
  `tác giả` để triệt non-consent khác trong cùng câu; mixed true-consent risk
  vẫn privacy precedence.
- Peer/lớp chỉ thêm safety reason khi kèm sharing, non-consent, passive hoặc
  sensitive risk. Generic image mặc định `ambiguous`; chỉ substantive-domain
  allowlist như biển báo/giao thông/đèn tín hiệu/đường bộ/xe/mũ bảo hiểm cho
  phép tiếp tục managed/curated retrieval, kể cả classroom qualifier.
- `app/api/chat/route.ts` chạy intent gate trước mọi legacy managed/curated
  ranking. Privacy dùng safe guidance tĩnh có tag `privacy_safety`; copyright
  chưa có reviewed intent-tagged record và câu ảnh mơ hồ trả `unavailable`,
  không cho legacy weak match chạy.
- `policyVersion` được ghi trong telemetry completion event nhưng không ghi câu
  hỏi hoặc dữ liệu nhạy cảm.
- Khi có copyright corpus đã duyệt, chỉ được thay nhánh fail-closed bằng
  structured retriever kiểm tra intent tag và eligibility; không nối lại
  untagged legacy ranking.
- `tests/image-intent.test.mjs` là intent matrix và route regression; focused
  39/39, current full suite 198/198, typecheck, lint và build pass ngày
  2026-07-31.

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
- provision phải có `in_force` effectivity window, revision ID và checksum;
- review/verification timestamp không được nằm trong tương lai;
- freshness policy phải có version, PM và internal content reviewer khác nhau,
  ngày duyệt hợp lệ và exact-host rule;
- không có policy/rule hoặc quá TTL đã duyệt thì loại candidate.

Trước migration 0002, schema không có review attribution trên `legal_entries`
và `legal_entry_citations`; `legal_provisions` cũng chưa có revision, checksum
hay effectivity window. Sau migration, row cũ giữ default:

```text
answer/link review = legacy_unverified
provision revision/checksum = NULL
provision effectivity = unknown
```

Mapper đọc metadata thật từ cột 0002. Legacy graph vẫn bị loại trước ranking;
chỉ fixture reviewed đầy đủ vượt gate. Đây không phải bằng chứng corpus
production đã sẵn sàng.

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

#### 7.3.2 US-025 slice 2 — reviewed graph bridge

Slice 2 là migration expand-only trên ba bảng bridge hiện tại, chưa tạo
`legal_answers` target model và không backfill dữ liệu pháp luật:

- `legal_entries` có review status và actor/timestamp nullable;
- `legal_entry_citations` có review status, actor/timestamp và binding tới đúng
  provision revision/checksum;
- `legal_provisions` có revision ID, checksum version, checksum SHA-256 và
  provision-level effectivity status/window.

Default của row cũ là `legacy_unverified`/`unknown`, actor và revision/checksum
để `NULL`. Migration không suy người tạo/người duyệt từ timestamp, không tự tạo
checksum/ngày hiệu lực và không nâng row legacy thành corpus RAG.

Effectivity vocabulary canonical:

```text
unknown | in_force | partially_in_force | superseded | expired
```

Chỉ `in_force` được candidate retriever chấp nhận.
`partially_in_force` cần active-span/page-anchor model riêng và vẫn bị loại
trong slice này.

Checksum contract:

```text
version: provision-sha256-v1
encoding: UTF-8(JSON array có thứ tự cố định)
text normalization: Unicode NFC + CRLF/CR → LF; không collapse whitespace
payload: version, source document number, official URL, revision ID,
         article/clause/point, original/simplified text,
         effectivity status/from/to
```

Backend phải tự tính lại digest từ graph canonical trước candidate eligibility;
không tin checksum do client/model cung cấp. Mọi canonical field của provision
đã có revision ID là immutable; nội dung mới phải là provision row/revision mới.
Source hoặc answer material update làm mất review eligibility của relation phụ
thuộc. Citation verified phải bind revision ID, checksum version và checksum
đang có trên provision.

Review status chỉ chứng minh metadata bốn mắt ở data boundary. Cho tới khi có
authenticated actor/RBAC/audit transaction của US-013/US-014, fixture/raw SQL
không phải bằng chứng người duyệt production thật. Production activation cũng
tiếp tục bị chặn cho tới khi US-022 chứng minh migration `0002` chạy trước code.

Slice vẫn chỉ trả internal ranked candidates, chưa tạo
`validatedEvidenceBundle`, chưa nối chat/OpenAI và chưa thêm FTS5.

Implementation/evidence:

- `drizzle/0002_reviewed_rag_bridge.sql`, `db/schema.ts`, `db/index.ts`;
- `computeProvisionChecksum` tự tính lại `provision-sha256-v1` bằng Web Crypto;
- migration test giữ legacy fail-closed, kiểm four-eyes, immutable revision,
  stale-binding/source/answer invalidation;
- D1 integration fixture reviewed đầy đủ tạo được internal ranked candidate.

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
- Production lane chỉ nhận durable registry `active/green` đã đủ independent
  approvals. Endpoint, credential reference, allowlist, quota và limit được
  resolve server-side; caller không truyền hoặc override các policy này.
- Manual upload và remote fetch đi qua cùng content gate: magic-byte/MIME,
  compressed/decompressed size, parser sandbox và quarantine. Không thực thi
  script, macro, embedded file hoặc instruction từ document.
- PROP-001 vẫn là external decision gate. Có thể triển khai/test repository,
  fetch guard và single-document local flow trước; không bật scheduled/batch
  production cho tới khi owner chốt topology và bindings least-privilege.

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

Queue production có delivery at-least-once. Consumer claim job bằng lease/CAS
trên state + version, renew hữu hạn và chỉ commit transition kế tiếp nếu còn
ownership. Mỗi transition ghi operation ID unique; ghi raw metadata, candidate
và audit liên quan phải nằm trong transaction D1 hoặc có outbox/reconciliation
được kiểm thử. Ack chỉ sau durable commit; retry dùng bounded exponential
backoff + jitter, vượt attempt/poison validation vào DLQ. Replay hoặc resume sau
crash phải no-op hoặc tiếp tục đúng state, không tạo raw/candidate/audit trùng
và không bỏ qua review.

Remote delete/supersede tạo tombstone/version mới thay vì hard-delete. Job
invalidate candidate/graph/index phụ thuộc và mở review task; raw snapshot chỉ
cleanup theo source retention sau reference/legal-hold check. R2 object metadata
và D1 `raw_sha256`/byte count/MIME phải khớp trước parse, review hoặc promotion;
mismatch đi quarantine.

Telemetry ingestion chỉ chứa stable registry/job/raw/candidate IDs, state,
counts, duration, policy/parser version và stable error code. Cấm raw URL query,
document text, candidate JSON, credential/provider payload, exception
message/stack. Runbook production phải query được backlog, throughput,
failure/quarantine/DLQ và gắn owner xử lý.

### 7.6 OpenAI provider contract

- Backoffice discovery có thể dùng Responses API `web_search` với
  `allowed_domains` official và yêu cầu complete sources; kết quả chỉ tạo
  candidate.
- Direct fallback theo DEC-010 là boundary riêng với evidence composer:
  `/api/chat` chỉ gọi sau managed/curated no-match và chỉ khi exact
  `AI_WEB_SEARCH_ENABLED=true`. Request dùng `store:false`,
  `tool_choice:"required"`, `include:["web_search_call.action.sources"]` và
  domain list hard-code phía server.
- Lượt direct search đầu chỉ cho phép `vbpl.vn`, `vbpl.moj.gov.vn`,
  `chinhphu.vn` hoặc subdomain chính thức và dùng `search_context_size=low`.
  Ít nhất một final official `url_citation` là bắt buộc; source consulted nhưng
  không annotate final answer không đủ điều kiện. Server deduplicate URL, loại
  credentials/fragment, giữ query hợp lệ trên đúng official authority và không
  tin title/URL ngoài exact parser.
- Theo DEC-012, chỉ khi lượt official trả no-result đủ điều kiện, route mới
  reserve budget và chạy lượt reference thứ hai. Exact allowlist ban đầu chỉ
  gồm `thuvienphapluat.vn`; URL phải là HTTPS exact authority/subdomain, không
  có userinfo hoặc port. Response dùng `sourceKind:"reference"` và cảnh báo
  không chính thống/cần xác minh.
- Client không được truyền domain/tool/instruction/model/base URL. Provider chỉ
  nhận câu hỏi cuối đã normalize và redact email/số điện thoại/URL; không nhận
  conversation history. Output có nhãn chưa kiểm duyệt; theo DEC-011 chỉ được
  persist thành intake draft không chứa raw question và không được tự promote
  vào RAG.
- Provider được yêu cầu trả plain text ngắn theo các nhãn cố định, nhưng server
  không tin định dạng đó. Trước persistence/public response, projector thuần
  phải loại Markdown/HTML/code marker và mọi URL/domain khỏi prose, chuẩn hóa
  thành bounded section DTO và tạo lại `answer` plain text để tương thích client
  cũ. Annotation chỉ dùng xác minh/canonicalize `sources`, không dùng để xóa
  mù theo index vì span có thể bao gồm từ có nghĩa.
- `/api/chat` có thể trả thêm `sections` và `sourceKind` cho
  `mode=web_search`; đây là additive
  presentation contract, chưa phải canonical legal-answer v1 của US-004.
  Frontend validate exact DTO, render bằng React text nodes, không dùng raw HTML
  hoặc Markdown parser. Link official phải qua `parseOfficialSourceLinks`; link
  reference phải qua `parseReferenceSourceLinks`. DTO sai thì fallback về
  `answer` plain text.
- Reference output chỉ được trình bày hướng dẫn chung. Guard phải cho phép số
  mô tả tình huống đời thường như “chở 3 người”, nhưng vẫn từ chối số tiền, số
  hiệu văn bản, điều/khoản/điểm, ngày/tuổi và ngưỡng pháp lý. Reference result
  là live/no-store: không gọi candidate persistence và không tham gia evidence
  graph hoặc RAG.
- Nếu reference provider text chứa chi tiết pháp lý định lượng, server bỏ toàn
  bộ provider prose và dùng safe fallback cố định chỉ nói đã tìm thấy nội dung
  tham khảo/cần đối chiếu; không sửa từng claim. Source vẫn phải qua exact URL
  guard, nếu không thì fail closed.
- Reference ưu tiên final `url_citation`; nếu model không annotate final safe
  prose, server được dùng complete consulted sources từ
  `web_search_call.action.sources`, nhưng chỉ giữ URL qua exact reference guard.
  Official result vẫn bắt buộc final citation, không dùng ngoại lệ này.
- Failure sau completed provider response giữ aggregate usage/model an toàn để
  settle đúng token thực tế. Nếu chạy hai lượt, telemetry ghi
  `providerRequestCount=2` và tổng input/output tokens của cả official lẫn
  reference; không ghi câu hỏi, answer hoặc URL.
- Numeric guard bao phủ cả cách viết hỗn hợp/phổ biến như `Điều 7a`,
  `ngày 1 tháng 1 năm 2025`, `Nghị định số 168 năm 2024` và ngưỡng viết bằng
  chữ. Superscript/đơn vị Việt hóa như `cm³`, `phân khối`, `km/giờ` phải được
  normalize và chặn; test vẫn cho phép số chỉ mô tả tình huống không kèm đơn vị
  hoặc kết luận định lượng.
- Timeout, non-2xx, refusal, incomplete/malformed/oversized response hoặc model
  mismatch fail closed về `unavailable`. Thiếu official final citation chỉ mở
  lượt reference theo DEC-012; reference validation/provider failure vẫn
  `unavailable`.

#### 7.2.1 Web-search candidate persistence và reviewed promotion

DEC-011 cho phép ngoại lệ hẹp so với “không persist” của DEC-010: server lưu
kết quả đã vượt exact official-URL guard thành candidate `draft`. Đây là intake
queue, chưa phải reviewed evidence.

- `/api/chat` chỉ trả `mode=web_search` sau khi lưu candidate, sources và usage
  thành công. Lỗi D1 trả `unavailable`; không có best-effort response thiếu
  trace.
- Không lưu raw question/conversation. `request_id` do Worker tạo và
  `content_sha256` tính từ answer/model/source canonical.
- Bốn bảng `web_search_candidates`, `web_search_candidate_sources`,
  `web_search_candidate_revisions`, `web_search_candidate_events` lần lượt giữ
  intake, source gốc, snapshot biên tập và audit append-only.
- Snapshot canonical gồm `topic`, `title`, `answer`, `tags` và ít nhất một
  citation có `title`, `url`, `documentNumber`, `effectiveFrom`,
  `lastVerifiedAt`; `article`, `clause`, `point`, `effectiveTo` là tùy chọn.
- URL revision phải canonicalize bằng DEC-004 và thuộc tập source ban đầu. Ngày
  dùng ISO `YYYY-MM-DD`.
- Session admin v2 resolve registry server-only thành stable `principalId`.
  Candidate API lấy role active từ D1; body không nhận actor/role.
- Trigger enforce active role, lifecycle
  `draft → pending_review → published → archived`,
  `pending_review → rejected → draft` và `reviewer != editor`. Initial
  answer/source, revision và event không được update/delete.
- Reviewed retrieval chỉ đọc candidate `published`, parse exact snapshot, bỏ
  citation ngoài allowlist/hết hiệu lực/tương lai/quá freshness window, rank
  deterministic rồi trả canonical DB source trước live web-search.
- Global budget dùng D1 atomic UTC-day bucket theo
  `web-search-budget-v1`. Missing/sai config hoặc D1 lỗi fail closed khi flag
  web-search bật. Telemetry chỉ ghi stable outcome/model/token/candidate ID.

Production activation: apply migration; seed distinct editor/reviewer principal
và role grant; cấu hình account registry/budget; deploy với flag false; smoke
auth/workflow/retrieval; verify Workers Logs + data-control/under-18; sau đó mới
canary flag. Rollback bằng `AI_WEB_SEARCH_ENABLED=false`.

- Extraction/composition dùng Structured Outputs theo JSON Schema.
- Runtime composer chỉ nhận sanitized question + validated evidence bundle.
- Model chỉ trả evidence IDs; server lấy citation/URL/mức xử lý từ D1.
- Missing key, timeout, invalid schema hoặc unknown evidence ID fail closed.
- `OPENAI_API_KEY` là secret server-only; `OPENAI_MODEL` và feature flags là
  configuration. Không dùng biến `NEXT_PUBLIC_*` cho provider secret.
- Config contract dự kiến trong `.env.example`:
  `AI_SHADOW_ENABLED=false`, `AI_WEB_SEARCH_ENABLED=false`,
  `AI_PROVIDER_TIMEOUT_MS`, `AI_PROVIDER_MAX_REQUESTS_PER_MINUTE`.
- Exact composer model allowlist của DEC-009:
  `gpt-5.4-mini`, `gpt-5.4-mini-2026-03-17`. OpenAI model reference xác nhận
  cả Responses API và Structured Outputs được hỗ trợ:
  [GPT-5.4 mini model](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
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
nhánh disabled return trước provider call. **Drift lịch sử trước DEC-009:**
adapter từng chỉ allowlist/default `gpt-5.6-sol`, trong khi env contract dùng
`gpt-5.4-mini`. Implementation hiện tại đã đóng drift theo exact policy mục
7.8; alias local và snapshot pin là hai model duy nhất được chấp nhận.

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
HTTP/network/timeout, timeout khi đọc streaming body, giới hạn byte thực,
provider-model attribution, cancel body non-2xx và static no-chat-integration;
kết quả hiện tại **20/20 pass**.

Chưa triển khai: caller fallback curated/unavailable, D1 citation assembly,
rate limit/quota/circuit breaker, cost aggregation, semantic claim-span
evaluator, canonical provenance/relationship verification và production
telemetry.

### 7.8 Lát cắt kế tiếp — offline AI shadow/local activation

Mục tiêu của lát cắt là kiểm chứng offline orchestration provider mà không nối
chat/API request path và không thay đổi response người dùng.
`AI_SHADOW_ENABLED` là canonical runner flag mới:
missing, rỗng hoặc khác exact `true` đều disabled. `OPENAI_API_KEY` hiện có chỉ
được đọc tại server runtime; key tồn tại không tự bật shadow. Flag foundation
`AI_REPHRASE_ENABLED` tại mục 7.7 là contract as-is của adapter cô lập và phải
được deprecate/không còn là activation path độc lập khi nối runner. Module/CLI
offline không được import hoặc gọi từ `/api/chat`/API v1 trong slice này.

Model policy `ai-shadow-model-v1`:

```ts
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const SUPPORTED_OPENAI_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.4-mini-2026-03-17",
] as const;
```

Chỉ trim outer whitespace rồi exact-match; không prefix, regex hoặc family
matching. Missing/rỗng dùng default alias. Local development và manual smoke
có thể dùng `gpt-5.4-mini` để khớp env contract hiện tại; golden-set evaluation,
canary/cutover hoặc bất kỳ bằng chứng cần reproducibility phải dùng pinned
`gpt-5.4-mini-2026-03-17`. `gpt-5.6-sol` và mọi ID khác trả
`INVALID_CONFIG` trước fetch. Thêm model cần official capability check,
cost/latency/security review, tests và decision update; provider response không
được tự mở rộng allowlist.

Precondition trước outbound call offline:

1. shadow flag bật;
2. config/key/model allowlist hợp lệ;
3. committed technical fixture đã bind version + checksum và có hai structural
   review label khác nhau cho mục đích smoke;
4. local validator chỉ chứng minh envelope/schema/checksum của fixture; adapter
   tiếp tục kiểm tra non-empty evidence và caller-supplied eligibility shape.
   Các bước này không xác thực actor, không truy vấn review ledger và không tạo
   production `validatedEvidenceBundle`;
5. fixture/request được snapshot/sanitize/bound trước async provider boundary.

Fixture này chỉ chứng minh provider boundary, không phải corpus pháp luật
production, authenticated four-eyes ledger hay evidence cho legal answer.

Nếu thiếu bất kỳ precondition nào, shadow return stable internal outcome và
không gọi provider. Provider request giữ contract:

```ts
type AiShadowRequestPolicy = {
  store: false;
  tools: readonly [];
  webSearch: false;
  input: {
    serverInstruction: string;
    sanitizedQuestion: string;
    reviewedEvidence: readonly ProviderEvidenceInput["evidence"];
  };
};
```

Không nhận base URL, tool, system/developer instruction, conversation hoặc
feature/policy override từ client. Không dùng Responses API web search,
built-in tool hay live web lookup. Output phải qua strict schema/evidence-ID
validation hiện có nhưng sau đó chỉ tạo internal shadow result và bị discard;
không được gắn citation/sanction hoặc mutate baseline response.

Shadow failure taxonomy dùng stable enum của mục 7.7, bổ sung
`MISSING_VALIDATED_BUNDLE` nếu cần. Missing key/evidence, timeout, network,
non-2xx, refusal, incomplete, schema/malformed output, unknown evidence ID hoặc
validator/provider error đều fail closed và không tác động baseline response vì
runner không nằm trong request path. Test static-import và integration phải
chứng minh chat/API không phụ thuộc runner; không được đổi curated thành
unavailable, HTTP status/header hay làm request người dùng phụ thuộc provider.

Prompt, sanitized question, evidence text, provider body/refusal và composition
không được ghi D1/R2/KV/Queue/file/cache/log hoặc telemetry. Object chỉ tồn tại
trong memory của invocation tới khi validation/discard hoàn tất. Provider call
luôn `store:false`. Telemetry `telemetry-v1` chỉ nhận:

- `requestId`;
- stable `shadowOutcome`/error enum;
- bounded canonical evidence IDs;
- allowlisted model, provider latency và token usage.

Telemetry cấm raw question/evidence/output, official URL/query, API key,
provider response/refusal, exception message/stack và mọi field ngoài allowlist.
Một layer duy nhất sở hữu provider telemetry.

`store:false` chỉ kiểm soát application state của Responses request, không tự
chứng minh Zero Data Retention. Theo
[OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data),
abuse-monitoring logs mặc định có thể chứa prompt/response và được giữ tới 30
ngày; Zero Data Retention hoặc Modified Abuse Monitoring là control cần approval
riêng. Vì vậy:

- offline fixture/smoke chỉ dùng synthetic technical content không có question,
  evidence hoặc personal data của user;
- trước route shadow/direct AI với dữ liệu thật phải verify exact
  organization/project đang có ZDR hoặc MAM phù hợp và product + privacy/legal
  owner phê duyệt data flow/retention;
- riêng personal data của trẻ dưới 13 tuổi hoặc dưới applicable age of digital
  consent bị cấm gửi nếu exact project chưa được xác minh ZDR; MAM hoặc
  `store:false` không thay gate này;
- logs/runbook phải ghi data-control verification evidence mà không ghi secret
  hay content.

Vì sản phẩm phục vụ học sinh, production gate còn áp dụng
[OpenAI Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance):
age-appropriate AI disclosure, content filters, reasonable
monitoring/reporting và escalation path cho high-risk interaction, age
assurance khi phù hợp, cùng privacy/legal review. Model phải được review lại
theo current under-18 guidance trước production; exact `gpt-5.4-mini` allowlist
ở đây chỉ cho offline shadow và không phải approval cho direct minor-facing
experience.

Verification tách hai lane:

- fixture lane tự động dùng injected fake provider, không credential/network,
  chứng minh no-call khi flag/config/evidence invalid, exact request policy,
  baseline invariance và mọi failure path;
- live smoke thủ công dùng `OPENAI_API_KEY` server-side cùng technical fixture
  không có dữ liệu người dùng, được version/checksum-bound và review riêng cho
  mục đích smoke trước khi gửi. Smoke chỉ chứng minh credential, outbound
  network, allowlisted model và provider structured-output compatibility; không
  chứng minh D1 graph, retrieval quality, semantic correctness,
  ZDR/MAM/data-control, under-18 safety, production readiness hoặc quyền trả
  output cho user.

Điều kiện direct `ai_assisted` là gate khác, không được activate bằng
`AI_SHADOW_ENABLED`: US-025 phải có validated production bundle và golden-set
gate đã duyệt; US-026 phải có semantic claim/span/predicate validator, exact
numeric/date/article guard, canonical D1 citation/sanction assembly,
rate-limit/cost/telemetry, prompt-injection negatives và API/E2E tests. Sau đó
product + technical + content review mới chốt rollout/canary/rollback để output
được phép tham gia `LegalAnswerResponse`.

Route-level shadow cũng không thuộc local slice. Ngoài production validated
bundle/output guard, Cloudflare integration phải có explicit execution-lifetime
seam (`ExecutionContext.waitUntil` hoặc abstraction tương đương đã test) để
response không chờ provider nhưng background call không bị runtime hủy. Thiếu
seam này, không import runner vào route.

**Implementation evidence — offline/local only (2026-07-31):**
`lib/ai-shadow.ts` triển khai batch runner strict flag, bounded case/quota,
config/fixture snapshot, checksum-bound synthetic fixture, no retry, discard
composition và content-free aggregate. `lib/openai-evidence.ts` dùng exact
alias/snapshot allowlist; timer bao trọn fetch + streamed body read và byte
limit được enforce cả khi thiếu/sai `Content-Length`.
`tests/ai-shadow.test.mjs` pass 9/9,
`tests/openai-evidence.test.mjs` pass 20/20, full local suite 212/212;
typecheck, lint, Vinext build và diff check pass.
`scripts/shadow-openai-evidence.mjs` với flag mặc định trả `DISABLED` mà không
outbound. Static route regression xác nhận `/api/chat` không import runner.
Manual live technical smoke với process-only flag đạt 2/2; request dùng alias
`gpt-5.4-mini`, provider trả actual pinned snapshot
`gpt-5.4-mini-2026-03-17`, tổng 1.522 tokens. Aggregate tách requested/observed
model và không chứa key, prompt, evidence, response ID hoặc composition. Smoke
không chứng minh ZDR/MAM, under-18 gate, route integration hoặc production
activation.

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

### 8.1 Activation sequence sau sidecar foundation

1. Chọn identity source: local registry chỉ dùng password hash có salt hoặc
   Cloudflare Access/OIDC; không thêm plaintext password theo role.
2. Session resolve stable principal ID và load role grant hiện hành; actor,
   reviewer, timestamp và trạng thái publish không nhận từ request body.
3. Đóng legacy direct-publish/hard-delete bypass trước khi mở review API.
4. Mỗi command dùng idempotency key + optimistic subject version và một
   transaction D1 cho decision, graph promotion và audit.
5. Promotion theo thứ tự source → provision → entry → citation; citation bind
   exact revision/checksum cuối cùng.
6. Chỉ sau integration test và retriever gate mới cho approval sidecar tham gia
   corpus readiness.

## 9. Security và privacy

### 9.1 Hiện có (As-is)

- Credential admin đọc server-side từ `ADMIN_USERNAME`,
  `ADMIN_PASSWORD_HASH` và `ADMIN_SESSION_SECRET`; plaintext `ADMIN_PASSWORD`
  không nằm trong runtime contract.
- Password hash có format versioned
  `v1$pbkdf2-sha256$600000$<salt>$<digest>`, salt 16 byte và digest 32 byte mã
  hóa base64url. Derivation dùng Web Crypto PBKDF2-HMAC-SHA256 để tương thích
  Cloudflare Worker; digest được so sánh bằng constant-work byte loop.
- Parser chỉ nhận đúng version, algorithm, iteration, số field, base64url
  canonical và độ dài salt/digest. Thiếu username/hash/session secret, session
  secret dưới 32 ký tự, password rỗng/quá 1024 byte hoặc hash malformed đều
  fail closed. Response login không tiết lộ field cấu hình nào sai.
- Script `npm run auth:hash` nhận password qua terminal không echo, xác nhận hai
  lần và dùng salt ngẫu nhiên. Runtime/application không log password, hash
  hoặc session secret.
- Session ký HMAC SHA-256, secret tối thiểu 32 ký tự, TTL 8 giờ.
- Cookie `HttpOnly`, `SameSite=Strict`, `Secure` trên HTTPS, path `/admin`.
- Mutation admin và login/logout kiểm tra same-origin.
- Chat giới hạn số lượng và độ dài message.

### 9.2 Bắt buộc trước production (To-be)

- Provision credential mạnh qua secret manager và benchmark PBKDF2 600.000 vòng
  trên Worker production-like; không tự giảm iteration nếu chưa có
  version/policy mới và security review.
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

### 9.3 Rate limit policy `rate-limit-v1`

Policy local/shadow ban đầu:

- login: 5 attempt/15 phút theo client+username, 20 attempt/15 phút theo client,
  20 attempt/60 phút theo account;
- chat: 20 request/60 giây và 200 request/ngày UTC theo client;
- backoff pair sau failed thứ 3/4 lần lượt 2/4 giây; failed thứ 5 block đến hết
  cửa sổ 15 phút; không sleep Worker.

Client identity chỉ lấy từ `CF-Connecting-IP`, normalize IPv4 hoặc IPv6 `/64`,
sau đó HMAC-SHA-256 bằng `RATE_LIMIT_KEY_SECRET` server-only tối thiểu 32 byte.
Username được normalize và HMAC với scope riêng. Pair-attempt bucket và
pair-penalty state dùng hai HMAC scope khác nhau. Không lưu/log raw IP,
username, session, question/message hoặc rate-limit key/hash.

D1 state dùng bounded fixed-window bucket/penalty có expiry/index. Consume phải
là atomic UPSERT/RETURNING; multi-scope decision chạy trong một D1
batch/transaction, không SELECT rồi UPDATE. Limiter fail closed trước PBKDF2,
retrieval hoặc provider: dependency/config lỗi trả 503 + `Retry-After: 5`; deny
trả 429 + computed `Retry-After`; cả hai `Cache-Control: no-store`.

Local implementation nằm tại `lib/rate-limit.ts` và migration expand-only
`0004_rate_limit_v1`:

- `rate_limit_buckets` có composite key scope/hash/window;
  client/account/pair-attempt capacity được consume trong cùng pre-PBKDF2 batch.
  Counter được cap ở `limit + 1` để tránh tăng vô hạn nhưng mọi request vẫn
  consume quota;
- `rate_limit_penalties` giữ consecutive pair failure, `blocked_until` và
  expiry. Mỗi failure/reset tạo `state_version` mới; success reset về zero bằng
  exact window/version CAS token lấy từ preflight, không delete row và không xóa
  nhầm failure đồng thời/ABA xảy ra sau preflight;
- mỗi batch chạy bounded cleanup tối đa 100 bucket và 100 penalty đã hết hạn.
  `expires_at` chỉ là logical eligibility. Physical deletion SLA cần scheduled
  sweep và production verification, không được suy ra từ lazy cleanup;
- mọi D1 batch phải trả đúng số result, `success: true` và results array cho
  từng statement, kể cả cleanup/reset; bất kỳ partial/false result nào trả 503;
- route factory có dependency injection cho test. Login guard chạy trước PBKDF2;
  chat guard chạy trước parse/retrieval/provider-adjacent logic. Không thêm 0004
  vào runtime DDL bootstrap: thiếu migration phải fail closed thay vì tự sửa
  production schema.

Các threshold trên chỉ là local/shadow default. Story US-019 chỉ `Done` sau khi
migration chạy trước code trên actual D1, Cloudflare header behavior và
concurrent smoke/telemetry được xác minh, đồng thời production
threshold/retention có decision record.

### 9.4 Observability policy `telemetry-v1`

Outer Worker là trust boundary tạo `crypto.randomUUID()`, không tin request ID
từ client, truyền ID nội bộ và gắn `X-Request-ID` lên mọi response. Route chỉ
tạo fallback server-side cho direct tests/local. Event ownership: outer Worker
phát một `http.response_ready`; chat phát một `chat.completed`; login phát một
`auth.login`; provider event chỉ do một layer sở hữu. `http.response_ready`
đo từ lúc outer handler nhận request tới khi application trả `Response` và
response headers sẵn sàng. Đây chỉ là handler-to-headers/TTFB proxy; không đo
thời gian consume streaming body, truyền mạng hoặc client render nên không được
gọi là request completion/end-to-end latency. Rate limiter chỉ tái sử dụng UUID
v4 từ header nội bộ `x-request-id`, không dùng `CF-Ray`; header thiếu hoặc sai
format tạo server UUID fallback. Rate limiter runtime không phát console log
riêng; chat/login route sở hữu semantic outcome để tránh duplicate event.

Logger dùng exact typed allowlist. Field tối thiểu gồm `schemaVersion`, event,
requestId, static route ID, method, status, outcome/mode và duration. Optional
fields chỉ là bounded internal IDs, policy/ranking/freshness version, allowlisted
provider result/latency/model/usage. Unknown field bị loại; error map thành stable
code. Cấm raw URL query/body/question/message/evidence/legal text, header/cookie,
credential/token/key, identity/network data, provider payload, exception
message/stack và rate-limit HMAC key/hash.

Chat phát stable outcome `retrieval_no_match` khi cả managed và curated
retrieval không có kết quả; failure generic vẫn là `unavailable`. Cả hai dùng
mode `unavailable`, không log câu hỏi hoặc tự tạo citation/record ID.

MVP dùng Workers Logs, 100% sampling khi lưu lượng còn thấp và retention 3 ngày.
Không ghi telemetry vào D1 hoặc bật Logpush/export khi chưa có approval riêng.
Editorial audit thuộc US-014 và không phụ thuộc telemetry sampling. Sink phải
inject được và có contract synchronous-only; serialization hoặc synchronous
sink failure không làm đổi HTTP response. Contract không bảo đảm queue,
delivery hoặc retry bất đồng bộ.

Không được log `retrievedRecordIds`/`citationIds` từ answer string hiện tại.
Sau khi US-025/US-026 nối runtime, `chat.completed` chỉ nhận canonical
answer/provision/citation IDs từ validated bundle/DB assembly và provider
outcome/latency/usage từ đúng layer sở hữu provider call. Integration test phải
đối chiếu IDs với response/evidence trong D1, dùng cùng outer `requestId` và
chứng minh không duplicate provider telemetry. Production gate gồm đúng Sites
project, retention/access/sampling, correlation smoke, structured
retrieval/provider query smoke, no-secret canary và alert smoke.

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
  `drizzle/0001_citation_foundation.sql`, rồi thêm reviewed relation,
  provision revision/checksum/effectivity bằng
  `drizzle/0002_reviewed_rag_bridge.sql`. `legal_entry_citations` tạm liên kết
  model answer hiện tại (`legal_entries`) với provision; khi `legal_answers`
  canonical được triển khai sẽ có migration quan hệ mới, không đổi nghĩa bảng
  cũ một cách ngầm định.
- Delivery slice 3 thêm sidecar identity-neutral bằng
  `drizzle/0003_editorial_trust_primitives.sql`. Migration không seed principal,
  role hoặc content, không backfill/promotion graph và chưa được runtime
  `db/index.ts` tự apply. Nó chỉ được kích hoạt sau migration-ledger gate.
- US-019 thêm `drizzle/0004_rate_limit_v1.sql` tạo hai bảng state không chứa raw
  identity. Migration không nằm trong `db/index.ts` bootstrap; route trả 503 cho
  tới khi migration ledger đã apply 0004 trước activation.
- Migration versioned là source of truth cho production. `db/index.ts` vẫn có
  DDL idempotent tương ứng chỉ để giữ local/Sites bootstrap hiện tại; đường
  bootstrap này phải được loại bỏ khi migration pipeline đã được xác minh.
- Không có seed/backfill trong Sprint 1B. Không record nào được tự động coi là
  nguồn đã kiểm chứng và không mapping sang văn bản thay thế khi chưa có
  người duyệt nội dung nội bộ phê duyệt.
- Migration 0001 là idempotent cho table/index/trigger creation; migration 0002
  dùng `ALTER TABLE ADD COLUMN` và phải được migration ledger apply đúng một
  lần. Cả hai có thứ tự trong `drizzle/meta/_journal.json`. Không tạo snapshot
  giả; trước workflow Drizzle Kit phụ thuộc snapshot phải regenerate/validate
  metadata bằng version đã pin.
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
- Offline AI shadow dùng `AI_SHADOW_ENABLED=false` mặc định, `store:false`,
  không web/tool và discard output; runner không import vào chat/API. Fixture
  verification và live smoke manual được ghi evidence riêng.
- Route shadow chỉ được xét sau production validated bundle/output guard và
  `waitUntil`/execution-lifetime seam có test; mọi provider failure phải giữ
  nguyên baseline response.
- Phase này không cấp quyền trả `ai_assisted`; direct response chỉ được review
  sau production bundle/eval của US-025 và validation/assembly/integration của
  US-026.

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
- tỷ lệ `curated`/`ai_assisted`/`web_search`/`unavailable`;
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
  kiến thức mở trong evidence composer. DEC-010 tạo boundary web-search riêng,
  không thay đổi composer.
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
  composer; không auto-publish. Phần cấm live-search cho end user được DEC-010
  thay đổi hẹp cho official-citation fallback và không cấp quyền persist.
- **DEC-007:** credential admin chỉ nhận hash versioned PBKDF2-HMAC-SHA256 có
  salt qua server-side secret manager; plaintext bị bỏ qua và cấu hình
  thiếu/malformed fail closed. Rotation đổi cả hash và session secret để làm
  phiên cũ mất hiệu lực.
- **DEC-008:** catalog resolver nhận snapshot
  `available_records|available_empty|unavailable`. Success-empty vẫn resolve
  static baseline và là `ready`; chỉ unavailable trả HTTP 200
  `dataState=degraded` + `Cache-Control: no-store`. Managed-only key hợp lệ
  không phải orphan. Reviewed suppression/archive là tombstone append-only áp
  dụng cả degraded fallback; content từng published/keyed không hard-delete hoặc
  tái sử dụng key. Local resolver slice không thay production migration gate.
- **DEC-009:** AI integration đầu tiên chỉ là offline/local shadow trên
  validated/reviewed technical fixture, không import vào chat/API; dùng
  `AI_SHADOW_ENABLED=false` mặc định và `OPENAI_API_KEY` server-only hiện có.
  Exact allowlist là
  `gpt-5.4-mini|gpt-5.4-mini-2026-03-17`; alias dùng local smoke, pinned
  snapshot dùng repeatable eval/cutover, còn `gpt-5.6-sol` bị từ chối. Request
  bắt buộc `store:false`, không web/tool; prompt/output không persist và output
  không đổi baseline response/citation. `store:false` không phải ZDR; route/user
  data cần verified data-control và under-18 safety/privacy/legal gate. Route
  shadow cần production bundle + `waitUntil` seam; direct `ai_assisted` cần gate
  US-025/US-026 cùng rollout review khác.
- **DEC-010:** direct web-search fallback là mode riêng, chỉ chạy sau RAG
  no-match và không thay thế evidence-bound composer. Câu trả lời phải có final
  citation Chính phủ qua exact HTTPS authority guard, gắn nhãn chưa kiểm duyệt
  và không persist. `thuvienphapluat.vn` bị loại khỏi direct domain list và chỉ
  dành cho backoffice discovery; thiếu official citation hoặc mọi lỗi đều
  `unavailable`. Feature flag là rollback boundary.
- **DEC-012:** nếu official direct search không có kết quả đủ điều kiện, route
  được chạy thêm một lượt reference search trên exact allowlist
  `thuvienphapluat.vn`. Kết quả phải có `sourceKind=reference`, cảnh báo không
  chính thống/cần xác minh, không chi tiết pháp lý định lượng và không persist
  thành candidate/evidence/RAG. Official search luôn chạy trước.
- **DEC-013:** `/api/chat` chạy topic gate deterministic trước mọi retrieval,
  provider và persistence. Phạm vi chỉ gồm giao thông, an toàn/ứng xử trên mạng
  và bản quyền học đường. Off-topic/no-match trả message ngắn không có legal
  form; reference chỉ dùng reduced form và không lưu; chỉ official result đúng
  loại, đúng URL guard và presentation hợp lệ mới được lưu draft. Reference
  safe-fallback có `answerOrigin=server_safe_fallback` do adapter tự gắn có thể
  không chứa topic signal; ngoại lệ này không áp dụng cho provider prose, không
  được suy ra bằng so sánh text và không mở đường persistence.

### Điểm còn mở

Các điểm cần product/technical owner chốt trước Sprint 1:

1. `last_verified_at` quá bao lâu thì nội dung phải review lại?
2. MVP có cần phân biệt mức áp dụng theo độ tuổi ngay trong data model không?
3. Duyệt initial latency gate ở mục 7.2 và chốt availability SLO là bao nhiêu?
4. Có lưu câu hỏi ẩn danh để cải thiện retrieval không; nếu có, retention và cơ
   chế loại dữ liệu cá nhân là gì?
5. Duyệt hay từ chối **PROP-001**: giữ public/admin/query trong Worker hiện tại
   và tách scheduled/batch ingestion thành Worker riêng?
