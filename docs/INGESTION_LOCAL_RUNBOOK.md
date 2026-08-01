# Runbook — Local fixture ingestion plan

Runbook này chỉ áp dụng cho feasibility slice local của US-024 tại
`lib/ingestion-local.ts`. Slice không phải connector hoặc ingestion job:
fixture JSON được static import vào module build, không nhận bytes từ caller,
không dùng filesystem API/fetch mạng/đọc env, gọi OpenAI, ghi D1/R2/Queue, tạo
quarantine hay publish nội dung.

## 1. Exact request contract

Caller truyền đúng bốn field:

```ts
{
  mode: "local_fixture",
  providerKey: "vbpl_national",
  sampleRef: "fixtures/source-registry/vbpl-nd168.sample.json",
  createdBy: "editor-local-spike"
}
```

Không field nào khác được chấp nhận. Các field như `registryRecord`, `baseUrl`,
`allowedHosts`, `credential`, `secret`, quota, limit hoặc đặc biệt `fixture` bị
từ chối, kể cả khi giá trị có vẻ hợp lệ. `createdBy` chỉ là nhãn actor cho
fixture local, không phải bằng chứng authentication/authorization.

Planner resolve canonical record từ static server-side `sourceRegistry`; caller
không truyền record hoặc policy. Chỉ exact record
`official/yellow/conditional_go` có non-null `sampleRef` khớp request mới được
dùng. Đây là ngoại lệ local/manual spike; source `yellow` tuyệt đối không đủ
điều kiện cho production ingestion.

Sau registry gate, planner resolve cùng `(providerKey, sampleRef)` trong trusted
manifest và dùng JSON được static import từ repository. Vì vậy `sampleRef` bind
với artifact đã commit, không phải nhãn cho bytes tùy ý do caller cung cấp.

## 2. Validation và output

Committed fixture và provision phải là plain object có exact keys, bounded
UTF-8 size, date/instant/checksum shape hợp lệ. Request được copy sang object
primitive mới; fixture được copy toàn bộ field/nested field và deep-freeze
đồng bộ trước `await` đầu tiên. Sau đó planner tái sử dụng
`mapOfficialSampleToDraft`, gồm HTTPS/host allowlist và checksum kiểm tra trên
original text. Không caller-owned mutable object nào tồn tại qua async boundary.

Output là deep-frozen plan:

- `schemaVersion/policyVersion = ingestion-local-v2`;
- registry snapshot chỉ ghi provider, sample ref và ba trạng thái local;
- source, provision và candidate đều chỉ `draft`, chưa verified/reviewed;
- `persistence = none`;
- `rawSnapshotRef = null`;
- không có publish, index hoặc promotion command.

Text giống prompt/instruction trong document chỉ được giữ nguyên như draft
data. Slice không parse instruction và không có AI/tool execution.

## 3. Idempotency

Key có format:

```text
local-fixture-sha256-v2:<64 lowercase hex>
```

Digest là SHA-256 trên canonical ordered field-name/value UTF-8 components, mỗi
component có unsigned 4-byte big-endian length prefix:

1. schema/policy `ingestion-local-v2`;
2. canonical `providerKey` và `sampleRef`;
3. mọi field top-level của fixture: provider, upstream ID, hai URL, fetched
   timestamp, content checksum, document number/title, issue/effective date;
4. mọi field provision: source anchor, article/clause/point,
   original/simplified text.

Nullable field có marker phân biệt `null` với string. Payload bytes được tạo
trước hashing `await`, nên mutation sau invocation không đổi identity.
`createdBy` không nằm trong content key để cùng exact artifact không tạo
identity khác theo operator; `fetchedAt` là provenance của artifact và **có**
trong key. Đây chỉ là deterministic plan key; chưa có D1 unique constraint,
at-least-once consumer hoặc deduplicate persistence evidence.

## 4. Stable redacted errors

Mọi reject dùng message chung `Local ingestion request rejected.` và một code:

| Code | Ý nghĩa an toàn |
|---|---|
| `INVALID_REQUEST` | Object/field/actor/provider shape không đúng exact contract |
| `UNSUPPORTED_MODE` | Mode khác `local_fixture` |
| `SOURCE_NOT_ELIGIBLE` | Canonical static source không đủ điều kiện local spike |
| `SAMPLE_REF_MISMATCH` | Sample ref không khớp canonical registry |
| `INVALID_FIXTURE` | Committed fixture/provision shape hoặc field không hợp lệ |
| `FIXTURE_TOO_LARGE` | Committed JSON fixture vượt 64 KiB UTF-8 |
| `FIXTURE_REJECTED` | Trusted manifest/mapper từ chối URL/host/checksum/content |

Error không echo request, URL, document text, secret, exception message/stack
hoặc mapper detail. Không log raw error object làm fallback.

## 5. Verification local

```bash
npm run test:ingestion-local
```

Focused tests phải chứng minh exact four-field request, caller fixture bị từ
chối, canonical registry + committed manifest, snapshot trước await, draft-only
deep freeze, no network side effect, deterministic all-fixture-field identity,
cùng original text nhưng khác metadata tạo key khác, hash không TOCTOU,
policy/secret/URL override rejection, production/forged source, malformed
request và redacted canary.

## 6. Production gates còn mở

Không dùng planner này trong route, scheduler hoặc Worker production. US-024
vẫn cần toàn bộ production AC riêng: durable active/green registry và hai
approval, trusted trigger/RBAC, expand-only migration, immutable R2 raw store,
fetch/upload/parser guards, quarantine, Queue lease/CAS/retry/DLQ,
crash-resume, tombstone/retention/legal hold, safe telemetry/audit,
four-eyes promotion và integration/security smoke. PROP-001 vẫn chờ owner duyệt.
