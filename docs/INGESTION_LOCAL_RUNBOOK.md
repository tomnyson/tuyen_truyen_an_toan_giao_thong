# Runbook — Local fixture ingestion plan

Runbook này chỉ áp dụng cho feasibility slice local của US-024 tại
`lib/ingestion-local.ts`. Slice không phải connector hoặc ingestion job:
không đọc file, fetch mạng, đọc env, gọi OpenAI, ghi D1/R2/Queue, tạo
quarantine hay publish nội dung.

## 1. Exact request contract

Caller local tự đọc fixture đã được commit rồi truyền đúng năm field:

```ts
{
  mode: "local_fixture",
  providerKey: "vbpl_national",
  sampleRef: "fixtures/source-registry/vbpl-nd168.sample.json",
  createdBy: "editor-local-spike",
  fixture: officialDocumentSample
}
```

Không field nào khác được chấp nhận. Các field như `registryRecord`, `baseUrl`,
`allowedHosts`, `credential`, `secret`, quota hoặc limit bị từ chối, kể cả khi
giá trị có vẻ hợp lệ. `createdBy` chỉ là nhãn actor cho fixture local, không
phải bằng chứng authentication/authorization.

Planner resolve canonical record từ static server-side `sourceRegistry`; caller
không truyền record hoặc policy. Chỉ exact record
`official/yellow/conditional_go` có non-null `sampleRef` khớp request mới được
dùng. Đây là ngoại lệ local/manual spike; source `yellow` tuyệt đối không đủ
điều kiện cho production ingestion.

## 2. Validation và output

Fixture và provision phải là plain object có exact keys, bounded UTF-8 size,
date/instant/checksum shape hợp lệ. Sau đó planner tái sử dụng
`mapOfficialSampleToDraft`, gồm HTTPS/host allowlist và checksum kiểm tra trên
original text.

Output là deep-frozen plan:

- `schemaVersion/policyVersion = ingestion-local-v1`;
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
local-fixture-sha256-v1:<64 lowercase hex>
```

Digest là SHA-256 trên năm UTF-8 component, mỗi component có unsigned 4-byte
big-endian length prefix:

1. `ingestion-local-v1`;
2. canonical `providerKey`;
3. canonical `sampleRef`;
4. fixture `upstreamId`;
5. verified `contentChecksum`.

`createdBy` và `fetchedAt` không nằm trong key để cùng upstream content không
tạo identity khác theo operator hoặc thời gian load. Đây chỉ là deterministic
plan key; chưa có D1 unique constraint, at-least-once consumer hoặc deduplicate
persistence evidence.

## 4. Stable redacted errors

Mọi reject dùng message chung `Local ingestion request rejected.` và một code:

| Code | Ý nghĩa an toàn |
|---|---|
| `INVALID_REQUEST` | Object/field/actor/provider shape không đúng exact contract |
| `UNSUPPORTED_MODE` | Mode khác `local_fixture` |
| `SOURCE_NOT_ELIGIBLE` | Canonical static source không đủ điều kiện local spike |
| `SAMPLE_REF_MISMATCH` | Sample ref không khớp canonical registry |
| `INVALID_FIXTURE` | Fixture/provision shape hoặc field không hợp lệ |
| `FIXTURE_TOO_LARGE` | JSON fixture vượt 64 KiB UTF-8 |
| `FIXTURE_REJECTED` | Mapper từ chối URL/host/checksum/content |

Error không echo request, URL, document text, secret, exception message/stack
hoặc mapper detail. Không log raw error object làm fallback.

## 5. Verification local

```bash
npm run test:ingestion-local
```

Focused tests phải chứng minh exact request, canonical registry, draft-only
deep freeze, no network side effect, deterministic/different-checksum
idempotency, policy/secret/URL override rejection, production/forged source,
unsafe URL, tamper, oversize, malformed fixture, redacted canary và prompt
injection inert.

## 6. Production gates còn mở

Không dùng planner này trong route, scheduler hoặc Worker production. US-024
vẫn cần toàn bộ production AC riêng: durable active/green registry và hai
approval, trusted trigger/RBAC, expand-only migration, immutable R2 raw store,
fetch/upload/parser guards, quarantine, Queue lease/CAS/retry/DLQ,
crash-resume, tombstone/retention/legal hold, safe telemetry/audit,
four-eyes promotion và integration/security smoke. PROP-001 vẫn chờ owner duyệt.

