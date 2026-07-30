# Progress Tracker — Luật Học Đường

> Cập nhật gần nhất: 2026-07-30
> Trạng thái được xác định từ bằng chứng trong repository, không phải phần trăm
> ước lượng. Checkbox chi tiết nằm trong `docs/USER_STORIES.md`.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| Done | Tất cả acceptance criteria của story hiện tại có bằng chứng |
| Partial | Đã có một phần implementation/evidence nhưng story chưa đạt đủ criteria |
| Todo | Chưa có implementation đáng kể |
| Blocked | Cần quyết định hoặc đầu vào bên ngoài trước khi chốt hướng triển khai |

US-022 giữ trạng thái story `Partial` vì đã có local implementation/runbook,
dù riêng production execution đang bị chặn bởi Sites control plane.

## Tổng quan

| Nhóm | Done | Partial | Todo | Blocked |
|---|---:|---:|---:|---:|
| Tra cứu và hiểu pháp luật | 2 | 3 | 0 | 0 |
| Hỏi đáp có kiểm soát | 0 | 4 | 0 | 0 |
| Quản trị nội dung | 2 | 2 | 1 | 0 |
| Dữ liệu và nguồn | 0 | 3 | 0 | 0 |
| Bảo mật, vận hành, chất lượng | 0 | 3 | 2 | 0 |
| RAG và nhập dữ liệu ngoài | 0 | 1 | 3 | 0 |
| **Tổng** | **4** | **16** | **6** | **0** |

## Theo dõi theo user story

| Story | Priority | Status | Owner | Evidence / next gap | Last updated |
|---|---|---|---|---|---|
| US-001 — Tra cứu theo từ khóa và chủ đề | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-002 — Xem căn cứ, mức xử lý và ví dụ | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-003 — Nguồn chính thức theo từng citation | P0 | Partial | Full-stack + PM | Có source list ở `lib/legal-content.ts`; thiếu mapping source/provision/answer | 2026-07-29 |
| US-004 — Câu trả lời đầy đủ có cấu trúc | P0 | Partial | Full-stack | Data nền có các thành phần; API vẫn trả `{answer, mode}` dạng text | 2026-07-29 |
| US-005 — Showcase public đầy đủ | P1 | Partial | Full-stack | `app/page.tsx` chỉ dùng title của hai item đầu; chưa render summary/source/topic | 2026-07-29 |
| US-006 — Chat ưu tiên kho kiến thức | P0 | Partial | Full-stack | Code path có evidence; rendered test chưa chạy và chưa đủ bốn nhóm | 2026-07-30 |
| US-007 — Fail closed ngoài phạm vi | P0 | Partial | Full-stack | Code path có evidence; regression definitions chưa có full-suite execution evidence | 2026-07-30 |
| US-008 — Guard citation/mức phạt của AI | P0 | Partial | Full-stack + Code review | Chat no-match vẫn trả `unavailable`; `lib/openai-evidence.ts` không cho model output citation/sanction/URL/chữ số và validate evidence ID. D1 citation/sanction assembly chưa triển khai | 2026-07-30 |
| US-009 — Phân biệt ảnh riêng tư/bản quyền | P0 | Partial | Full-stack + Code review | Branch `hình ảnh` → copyright đã gỡ khỏi `lib/legal-chat.ts`; chưa có intent/ranking riêng và test đủ hai intent | 2026-07-29 |
| US-010 — Auth khu vực quản trị | P0 | Partial | Full-stack + Code review | Code path có evidence; auth regression definitions chưa có full-suite execution evidence | 2026-07-30 |
| US-011 — CRUD law/showcase | P0 | Done | Full-stack | Admin UI, API và D1 schema đã có; còn thiếu integration test nhưng không nằm trong criteria của story này | 2026-07-29 |
| US-012 — Chỉ public record published | P0 | Done | Full-stack | `app/api/content/route.ts`; `lib/legal-chat.ts`; `db/schema.ts` | 2026-07-29 |
| US-013 — Workflow review và RBAC | P0 | Partial | Full-stack + PM + Code review | Schema mới enforce four-eyes và immutable creator; 13 schema tests pass. CMS vẫn chưa có roles, reviewer API, attribution hay workflow | 2026-07-29 |
| US-014 — Audit/version history | P1 | Todo | Full-stack + Code review | Chưa có revision/audit model; DELETE đang xóa cứng | 2026-07-29 |
| US-015 — Source/provision data model | P0 | Partial | Full-stack + PM | Ba bảng, migration, allowlist/authority, four-eyes và runbook có evidence; 13/13 schema tests pass. API citation guard và seed/backfill execution còn mở | 2026-07-29 |
| US-016 — Theo dõi hiệu lực nguồn | P0 | Partial | Full-stack + PM + Internal content reviewer | Source metadata, `last_verified_at`, publish guard và invalidation trigger có schema-test evidence. Retrieval chưa dùng structured validity; production migration chưa chạy | 2026-07-29 |
| US-017 — Deduplicate dữ liệu nền/CMS | P1 | Partial | Full-stack | Public page nối hai mảng trực tiếp; cần stable key và seed/override rule | 2026-07-29 |
| US-018 — Password hash và env nhất quán | P0 | Partial | Full-stack + Code review | `.env.example` đã bỏ `admin/admin` và mô tả đúng runtime; code vẫn xác thực bằng `ADMIN_PASSWORD` plaintext, chưa hỗ trợ hash/rotation | 2026-07-29 |
| US-019 — Rate limit login/chat | P0 | Todo | Full-stack + Code review | Chưa có implementation | 2026-07-29 |
| US-020 — Logging/observability an toàn | P1 | Todo | Full-stack + PM + Code review | Chưa có implementation hoặc retention policy | 2026-07-29 |
| US-021 — Backend/workflow E2E tests | P0 | Partial | Full-stack + Code review | Schema foundation 13/13 và AI adapter contract 15/15 pass. Full build/rendered suite không chạy do thiếu project `node_modules`/`dist`; chưa có public/retrieval D1 E2E | 2026-07-30 |
| US-022 — Runtime/deploy thống nhất | P0 | Partial | PM + Full-stack | Migration/runbook có local evidence, nhưng production **BLOCKED**: Sites `project_id` không resolve và migration control-plane behavior chưa xác minh; chưa smoke test | 2026-07-29 |
| US-023 — Đánh giá/đăng ký nguồn ngoài | P0 | Todo | PM + Internal content reviewer | Landscape assessment là pre-story context; thiếu registry/provider docs, sample, terms và feasibility spike cụ thể | 2026-07-30 |
| US-024 — Ingestion vào staging/draft | P0 | Todo | Full-stack + Code review + Internal content reviewer | `.env.example` có placeholder/flags; chưa có connector, raw store/quarantine, idempotency hoặc integration tests | 2026-07-30 |
| US-025 — Index/retrieval RAG | P0 | Todo | Full-stack + PM + Code review + Internal content reviewer | Chưa có FTS5 index, evidence bundle, threshold hoặc golden-set eval | 2026-07-30 |
| US-026 — Evidence-bound AI analysis | P0 | Partial | Full-stack + Code review | Evidence-only Responses adapter, strict schema, caller-metadata gate, no-digit/citation guard và contract tests có evidence; fixture smoke pass. Chưa nối retriever/chat, chưa verify canonical provenance/relations, DB citation assembly, semantic span gate, rate limit hay production telemetry | 2026-07-30 |

## Thứ tự triển khai đề xuất

### Decision Log

| Ngày | ID | Quyết định | Story |
|---|---|---|---|
| 2026-07-29 | DEC-001 | Cloudflare Worker + D1 là production primary. | US-022 |
| 2026-07-29 | DEC-002 | Ngoài kho đã duyệt trả `unavailable`; AI chỉ diễn giải evidence đã truy xuất. | US-008 |
| 2026-07-29 | DEC-003 | Bắt buộc quy trình bốn mắt `editor != reviewer`. | US-013 |
| 2026-07-29 | DEC-004 | Chỉ publish source thuộc `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` và subdomain chính thức. | US-015, US-016 |
| 2026-07-30 | DEC-005 | RAG-first: retrieve corpus đã duyệt trước khi model compose; MVP không bắt buộc vector DB. | US-025, US-026 |
| 2026-07-30 | DEC-006 | Dữ liệu ngoài chỉ vào draft có provenance/four-eyes; AI không auto-publish hoặc fallback kiến thức mở. | US-023, US-024, US-026 |

### Sprint 1A — Safety hotfix

**Mục tiêu:** loại production blocker pháp lý đã biết trước khi mở rộng
backend.

**In scope**

- [x] **P0 / US-016:** tạm loại hai mục “Sao chép tác phẩm trái phép, đạo văn”
  và “Cố ý vô hiệu biện pháp bảo vệ phần mềm” đang dẫn Nghị định 131 khỏi
  public, retrieval và chat context; admin `POST`/`PATCH` từ chối publish
  legal basis match deny-list trước DB access.
- [ ] **Partial / US-016 + US-021:** regression definitions đã có cho static
  homepage, chat copyright, no-provider call và admin rejection. Bundled Node
  syntax checks cùng matcher probe 4 blocked/2 allowed đã pass, nhưng chưa có D1
  fixture cho `/api/content`/managed retrieval và chưa có bằng chứng full suite
  đã chạy.
- [x] **Handoff sang Sprint 1B / US-015:** citation schema foundation được tách
  khỏi hotfix và triển khai ở Sprint 1B.

**Không thuộc Sprint 1A:** tự mapping hai mục bản quyền sang điều/khoản/mức phạt
mới. Việc này chỉ thực hiện sau khi người duyệt nội dung nội bộ phê duyệt
mapping theo quy trình four-eyes.

### Sprint 1B — Citation schema foundation

**Mục tiêu:** tạo nền tảng dữ liệu citation-first trên D1 mà không tự đưa nội
dung pháp lý chưa duyệt vào production.

- [x] Tạo migration cho `legal_sources`, `legal_provisions` và quan hệ
  answer-citation theo US-015.
- [x] Thêm validation `official_url`/authority theo DEC-004; source ngoài allowlist không
  được publish.
- [x] Thêm expand-only migration và runbook preflight/verify/restore/rollback.
- [x] Schema/migration/allowlist/four-eyes/invalidation tests chạy 13/13 pass,
  0 skip.
- [ ] Apply migration trên production D1: **BLOCKED** vì Sites `project_id`
  không resolve và control plane chưa chứng minh migration-before-activation.
- [ ] Chạy full build/rendered suite: chưa chạy do thiếu `node_modules`/`dist`.

**Out of scope:** seed, backfill hoặc mapping Nghị định 341/2025/NĐ-CP trong
Sprint 1B.

### Milestone 0 — Quyết định và điều kiện đầu vào

- [x] CR-001: xác minh từ nguồn chính thức rằng Nghị định 131/2013/NĐ-CP hết
  hiệu lực toàn bộ từ 15/02/2026.
- [x] Chốt Cloudflare Worker + D1 là production primary.
- [x] Chốt AI chỉ diễn giải evidence đã truy xuất; ngoài kho trả `unavailable`.
- [x] Chốt quy trình bốn mắt `editor != reviewer`.
- [x] Chốt reviewer là internal content reviewer; không cần external legal
  reviewer.
- [x] Chốt DEC-004 source allowlist mặc định; nguồn ngoài allowlist không
  publish.
- [x] Chốt DEC-005 RAG-first và DEC-006 ingestion draft/four-eyes; đánh giá
  nguồn chính thức hiện biết ở `docs/THIRD_PARTY_DATA_ASSESSMENT.md`.
- [ ] Owner duyệt **PROP-001**: giữ public/admin/query trong Worker hiện tại,
  tách scheduled/batch ingestion thành Worker riêng.

### Sprint 1C — Source feasibility và ingestion safety

**Mục tiêu:** xác minh một nguồn cụ thể và thiết kế ingestion an toàn trước khi
fetch dữ liệu production.

- [ ] US-023: nhận API docs/export URL, sample, terms/license, quota và update
  semantics của provider cụ thể.
- [ ] US-023: spike mapping một sample vào source/provision và quyết định
  go/no-go.
- [ ] US-024: thiết kế schema raw document/job/quarantine và fetch guard.

**Out of scope/gate:** không ingest production hoặc auto-publish trong sprint
này.

### Milestone 1 — Citation model và corpus foundation

- [ ] US-003: expose citation có URL và metadata qua API/UI.
- [ ] US-016: tích hợp metadata hiệu lực/invalidation vào public/chat retrieval.
- [ ] US-017: migrate/seed dữ liệu nền và quy tắc deduplicate.
- [ ] US-015/US-016: hoàn tất provision-level effectivity, sanction model và
  source freshness policy.

### Milestone 2 — Editorial workflow và ingestion

- [ ] US-013: roles và state machine review.
- [ ] US-014: revisions/audit và archive.
- [ ] US-021: test `draft → review → publish`.
- [ ] US-023: provider registry/spike đạt go gate.
- [ ] US-024: ingestion Worker, raw R2, candidate/quarantine và four-eyes.
- [ ] Corpus readiness: legacy `published` không vào RAG nếu chưa review theo
  workflow mới.

### Milestone 3 — RAG retrieval và answer contract

- [ ] US-004: chuyển API/UI sang response có cấu trúc.
- [ ] US-008: chỉ gắn citation/mức phạt từ record đã truy xuất.
- [ ] US-009: sửa taxonomy/ranking cho ảnh riêng tư và bản quyền.
- [ ] US-005: hoàn thiện showcase public.
- [ ] US-025: FTS5/structured retrieval, evidence bundle và golden-set eval.
- [ ] US-026: evidence-bound AI composer và failure-path guards.
- [x] **Partial / US-026:** adapter foundation đã triển khai cô lập, feature
  flag off mặc định, chỉ nhận validated non-empty evidence bundle và chưa nối
  `/api/chat`.
- [ ] Chỉ shadow trên fixture/corpus đã qua review; production cutover sau khi
  Milestone 2 hoàn tất.

### Milestone 4 — Production hardening

- [ ] US-018: password hash, secret rotation và env cleanup.
- [ ] US-019: rate limit login/chat.
- [ ] US-020: logging, privacy và observability.
- [ ] US-022: deploy runbook và smoke test trên platform đã chốt.
- [ ] Provision AI budget/key/telemetry và chỉ bật feature flag sau shadow eval.

## Verification evidence

### 2026-07-30 — US-026 evidence composer slice

- PM audit chạy 13/13 test trước hardening; Full-stack chạy suite cuối
  `node --experimental-strip-types --test tests/openai-evidence.test.mjs`:
  **14/14 pass** trước final review hardening. Suite kiểm request contract,
  flag/missing key no-fetch, caller eligibility metadata, request-envelope
  defense với injection string, unknown/duplicate ID, numeric/citation
  smuggling, malformed/incomplete/refusal, HTTP/network và timeout. Kết quả
  final sau hardening được ghi lại khi rerun bên dưới.
- Final review hardening thêm empty-draft và assistant/completed-message guards;
  rerun cùng command: **15/15 pass**.
- `node --test tests/schema-foundation.test.mjs`: **13/13 pass**, xác nhận thay
  đổi adapter không làm regression citation schema foundation.
- `node --env-file=.env.local --experimental-strip-types
  scripts/smoke-openai-evidence.mjs`: **pass** với một fixture kỹ thuật không có
  dữ liệu người dùng; model `gpt-5.6-sol`, usage 539 input + 225 output = 764
  tokens. Không ghi API key hoặc provider payload vào tài liệu/log bàn giao.
- Full build/rendered suite chưa chạy vì project `node_modules`/`dist` vẫn chưa
  có trong workspace; đây không được tính là bằng chứng pass.

## Cách cập nhật tracker

1. Khi bắt đầu một story, giữ trạng thái `Todo/Partial` và ghi owner.
2. Mỗi acceptance criterion chỉ được check khi có code, test hoặc tài liệu quyết
   định tương ứng.
3. Chỉ chuyển `Done` khi checkbox story và tất cả checkbox con đều là `[x]`.
4. Ghi evidence bằng path file/test/commit hoặc link deployment.
5. Cập nhật ngày `Last updated` của story thay đổi.
6. Nếu cần quyết định bên ngoài, ghi `Blocked` và mô tả đúng câu hỏi cần trả lời.
7. Code review không tự chuyển story sang `Done`; reviewer xác nhận criteria và
   test trước khi cập nhật trạng thái.
