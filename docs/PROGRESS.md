# Progress Tracker — Luật Học Đường

> Cập nhật gần nhất: 2026-07-31
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
| Tra cứu và hiểu pháp luật | 3 | 2 | 0 | 0 |
| Hỏi đáp có kiểm soát | 2 | 3 | 0 | 0 |
| Quản trị nội dung | 3 | 2 | 0 | 0 |
| Dữ liệu và nguồn | 0 | 3 | 0 | 0 |
| Bảo mật, vận hành, chất lượng | 1 | 4 | 0 | 0 |
| RAG và nhập dữ liệu ngoài | 0 | 4 | 0 | 0 |
| **Tổng** | **9** | **18** | **0** | **0** |

## Theo dõi theo user story

| Story | Priority | Status | Owner | Evidence / next gap | Last updated |
|---|---|---|---|---|---|
| US-001 — Tra cứu theo từ khóa và chủ đề | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-002 — Xem căn cứ, mức xử lý và ví dụ | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-003 — Nguồn chính thức theo từng citation | P0 | Partial | Full-stack + PM | Có source list ở `lib/legal-content.ts`; thiếu mapping source/provision/answer | 2026-07-29 |
| US-004 — Câu trả lời đầy đủ có cấu trúc | P0 | Partial | Full-stack + PM | AC/spec v1 và direct-AI gate đã refine; shadow không được đổi response. Còn citation graph/validated bundle, API/UI structured contract, validation/eval và negative tests; API hiện vẫn trả text `{answer, mode}` | 2026-07-31 |
| US-005 — Showcase public đầy đủ | P1 | Done | Full-stack + Code review | Public projector + 503/no-store dependency contract; exact client DTO; UI render toàn bộ API order theo stable ID, đủ field/source, loading/empty/degraded và accessible detail dialog/focus recovery; focused 15/15, current full 198/198 pass | 2026-07-31 |
| US-006 — Chat ưu tiên kho kiến thức | P0 | Partial | Full-stack | Rendered/chat suite 15/15 pass; vẫn chưa đủ bốn nhóm kiến thức nền theo AC | 2026-07-31 |
| US-007 — Fail closed ngoài phạm vi | P0 | Done | Full-stack | Ngoài phạm vi, empty/malformed input và no-ungrounded-provider regressions đã chạy trong rendered suite 15/15 pass | 2026-07-31 |
| US-027 — Allowed-source web fallback | P0 | Partial | Full-stack + PM + Code review | Adapter + curated-first route + warning/source UI, D1 global budget và provider telemetry đã có; full 230/230 + build pass. Còn production data-control, under-18 disclosure, D1/Logs smoke và rollout review | 2026-07-31 |
| US-028 — Persist/review/reuse web candidate | P0 | Partial | Full-stack + PM + Code review | D1 immutable draft/source/revision/audit/budget; multi-account stable principal + D1 RBAC; CMS four-eyes/history; published/current retrieval; focused 4/4, combined 24/24, full 230/230, type/lint/build pass. Production migration/principal/privacy/Logs/D1 smoke còn mở | 2026-07-31 |
| US-008 — Guard citation/mức phạt của AI | P0 | Partial | Full-stack + Code review | Evidence composer vẫn tách khỏi chat và không cho model output citation/sanction/URL/chữ số; direct web fallback là boundary US-027 riêng. D1 citation/sanction assembly chưa triển khai | 2026-07-31 |
| US-009 — Phân biệt ảnh riêng tư/bản quyền | P0 | Done | Full-stack + Code review | `image-intent-v2`: guarded accentless image, generic-default ambiguous + traffic allowlist, risk-gated peer/class và mixed consent/authorship privacy precedence; focused 39/39, current full 198/198 pass | 2026-07-31 |
| US-010 — Auth khu vực quản trị | P0 | Done | Full-stack + Code review | Anonymous redirect, invalid credential, signed session và admin access regressions đã chạy trong rendered suite 15/15 pass | 2026-07-31 |
| US-011 — CRUD law/showcase | P0 | Done | Full-stack | Admin UI, API và D1 schema đã có; còn thiếu integration test nhưng không nằm trong criteria của story này | 2026-07-29 |
| US-012 — Chỉ public record published | P0 | Done | Full-stack | `app/api/content/route.ts`; `lib/legal-chat.ts`; `db/schema.ts` | 2026-07-29 |
| US-013 — Workflow review và RBAC | P0 | Partial | Full-stack + PM + Code review | 0003 trust primitives + US-028 authenticated multi-account candidate API/CMS enforce D1 role và independent reviewer. Legacy law/showcase vẫn direct publish; generic graph activation còn mở | 2026-07-31 |
| US-014 — Audit/version history | P1 | Partial | Full-stack + Code review | Candidate revision/event/history UI và archive append-only đã có; 0003 generic history vẫn chưa nối mọi mutation law/showcase | 2026-07-31 |
| US-015 — Source/provision data model | P0 | Partial | Full-stack + PM | 0001–0002, allowlist/authority, four-eyes, immutable revision/checksum/effectivity metadata và runbook có evidence; 17/17 schema tests pass. API citation guard và seed/backfill execution còn mở | 2026-07-31 |
| US-016 — Theo dõi hiệu lực nguồn | P0 | Partial | Full-stack + PM + Internal content reviewer | Source/provision effectivity, freshness gate và invalidation có schema/retriever evidence. Public/chat/index retrieval chưa tích hợp structured validity; production migration chưa chạy | 2026-07-31 |
| US-017 — Deduplicate dữ liệu nền/CMS | P1 | Partial | Full-stack + Code review | Local `catalog-resolver-v1`: 3-state snapshot, key/override/managed-only, structural distinct actor labels + SHA integrity, non-eligible tombstone, collision/orphan/no-resurrection, scalar snapshot và failed-closed degraded factory; focused 20/20, full 198/198. Chưa có authenticated reviewed ledger/export signature, migration/backfill hoặc API/page/chat activation | 2026-07-31 |
| US-018 — Password hash và env nhất quán | P0 | Done | Full-stack + Code review | PBKDF2 Web Crypto hash/version/salt, strict fail-closed config/parser, generator + rotation runbook; focused auth 6/6, rendered 15/15, build và typecheck pass | 2026-07-31 |
| US-019 — Rate limit login/chat | P0 | Partial | Full-stack + Code review | `rate-limit-v1` + atomic global web token budget local đã có; còn production migration/header/concurrency/retention/threshold approval | 2026-07-31 |
| US-020 — Logging/observability an toàn | P1 | Partial | Full-stack + PM + Code review | Web provider model/usage/outcome và candidate ID đã vào allowlisted telemetry; còn production Workers Logs/access/retention/canary/alert gate và structured legal graph IDs | 2026-07-31 |
| US-021 — Backend/workflow E2E tests | P0 | Partial | Full-stack + Code review | Full local **230/230**; có authenticated editor→reviewer candidate API E2E, self-review/spoof/stale guards. Còn CI và production D1 smoke | 2026-07-31 |
| US-022 — Runtime/deploy thống nhất | P0 | Partial | PM + Full-stack | Vinext build + Sites archive validation pass, artifact có server/hosting/journal/0005. Production **BLOCKED**: connector/source publish credential không khả dụng trong phiên này và migration-before-activation/D1 smoke chưa xác minh | 2026-07-31 |
| US-023 — Đánh giá/đăng ký nguồn ngoài | P0 | Partial | PM + Internal content reviewer | Static registry, official sample, draft-only mapper, go/no-go và 8/8 tests có evidence. Mọi `green` fail-closed; còn thiếu authenticated durable PM+reviewer approval, approved terms/license và provider contract | 2026-07-31 |
| US-024 — Ingestion vào staging/draft | P0 | Partial | Full-stack + Code review + Internal content reviewer | Local v2: exact four-field request, static committed-fixture manifest, snapshot-before-await, all-fixture-field canonical identity, draft-only frozen plan và 7/7 tests; current full 198/198 pass. Không có migration/connector/consumer/D1/R2/Queue/quarantine hay production activation | 2026-07-31 |
| US-025 — Index/retrieval RAG | P0 | Partial | Full-stack + PM + Code review + Internal content reviewer | US-028 published web candidate đã có authenticated promotion và deterministic effective/fresh retrieval trước live web. Structured legal graph/FTS5/validated bundle/golden-set vẫn mở | 2026-07-31 |
| US-026 — Evidence-bound AI analysis | P0 | Partial | Full-stack + PM + Code review | Local AC đã check cho offline runner/model/fixture/isolation/no-persist/tests và adapter config/failure guards; 9/9 + 20/20, full 212/212, live technical 2/2. Không nối chat; production bundle, `waitUntil`, semantic/DB assembly, rate-limit/budget, ZDR/under-18 và direct AI vẫn mở | 2026-07-31 |

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
| 2026-07-31 | DEC-007 | Admin credential chỉ dùng versioned salted PBKDF2 hash; plaintext bị bỏ qua, rotation invalidate session. | US-018 |
| 2026-07-31 | DEC-008 | Catalog snapshot có `available_records|available_empty|unavailable`; success-empty là static overlay ready, unavailable mới degraded 200/no-store; reviewed suppression chặn static resurrection. | US-017 |
| 2026-07-31 | DEC-009 | AI integration đầu tiên chỉ là offline/local shadow, không import chat/API; `AI_SHADOW_ENABLED=false`, exact allowlist `gpt-5.4-mini|gpt-5.4-mini-2026-03-17`, `store:false`, không web/tool/persist. Route shadow chờ production bundle + `waitUntil` seam. | US-026, US-004 |
| 2026-07-31 | DEC-010 | RAG no-match có thể gọi direct web search có kiểm soát; chỉ final official citation qua exact URL guard được trả, Thư Viện Pháp Luật discovery-only, output gắn nhãn. Phần không persist được DEC-011 thay hẹp bằng draft-only persistence. | US-027 |
| 2026-07-31 | DEC-011 | Web result qua official guard được persist thành immutable draft không chứa raw question; chỉ authenticated four-eyes approval mới đưa vào reviewed retrieval/RAG. | US-028, US-013, US-014, US-025 |

### Batch local tiếp theo — specification gate và implementation

Batch này không cần production credential. Thứ tự implementation đề xuất:

1. [x] **US-009 intent privacy/copyright — Done:** classifier deterministic,
   safety precedence, route gate trước legacy retrieval và intent matrix đã
   triển khai; copyright chưa có reviewed tagged corpus tiếp tục fail closed.
2. [x] **US-005 showcase renderer — Done:** render toàn bộ DTO theo API order,
   đủ field/source, detail accessible và state loading/empty/degraded; API phân
   biệt dependency error bằng 503/no-store. Component không merge
   static/managed và không triển khai resolver của US-017.
3. [x] **Partial / US-017 canonical catalog resolver:** pure resolver đã có
   immutable content key, snapshot 3-state, structural actor-label separation +
   SHA integrity, non-eligible tombstone, collision/orphan/no-resurrection và
   local contract tests; authenticated reviewed ledger/export signature,
   migration và consumer activation vẫn chưa triển khai.
4. **US-004 structured answer v1:** làm cuối vì phụ thuộc canonical key của
   US-017 và citation/evidence graph của US-003/US-015/US-025. Curated path
   không cần API key; `ai_assisted` tiếp tục gated bởi US-008/US-026.

- [x] AC và technical spec của bốn story đã được refine trước implementation.
- [x] US-009 và US-005 chỉ chuyển `Done` sau code/test evidence; US-017 chỉ
  check local-feasibility AC có resolver/test evidence, còn production AC và
  US-004 trong batch vẫn chưa check.
- [x] **Spec only / US-017 conflict resolution:** DEC-008 đã khóa success-empty,
  orphan, degraded response, suppression/archive và local-vs-production scope;
  không dùng quyết định tài liệu này làm completion evidence.

### Batch local AI shadow — specification gate

1. [x] **Spec only / US-026 + US-004:** DEC-009 đã khóa
   `AI_SHADOW_ENABLED=false`, dùng `OPENAI_API_KEY` server-only hiện có,
   validated evidence precondition, `store:false`, no web/tool, discard/no
   persistence, baseline invariance, content-free telemetry và exact model
   allowlist. Official model reference đã verify `gpt-5.4-mini` hỗ trợ Responses
   + Structured Outputs.
2. [x] Triển khai offline shadow runner sau committed
   version/checksum-bound technical fixture đã review riêng và local validator;
   flag off, missing key/evidence và mọi provider/schema failure phải no-call
   hoặc stable redacted outcome. Static test chứng minh runner không được import
   bởi chat/API route.
3. [x] Chạy fixture suite bằng injected fake provider; ghi riêng command/count
   và không yêu cầu credential/network.
4. [x] Chạy live smoke manual bằng technical fixture không có dữ liệu người
   dùng đã version/checksum-bound và review riêng; ghi model/outcome/usage an
   toàn. Local smoke dùng alias; repeatable eval/cutover pin snapshot. Smoke
   không check retrieval, semantic validation, ZDR/MAM, under-18 safety, public
   integration hoặc direct-answer activation.
5. [ ] Chỉ xem xét direct `ai_assisted` sau khi production validated bundle/eval
   US-025 và semantic guard/DB assembly/rate-limit/telemetry/API E2E US-026 có
   evidence cùng rollout review. Route shadow trước đó cũng cần
   `waitUntil`/execution-lifetime seam có test.
6. [ ] Trước khi gửi dữ liệu học sinh thật: verify data-control trên exact
   OpenAI project và product/privacy/legal approval. Personal data của trẻ dưới
   13/applicable digital-consent age yêu cầu verified ZDR; đồng thời hoàn tất
   under-18 disclosure, age-appropriate filter, monitoring/reporting,
   high-risk escalation và age assurance khi phù hợp.

US-026 giữ `Partial`; spec-only checkpoint không check các implementation AC
mới ngoài local/offline evidence đã liệt kê; không thay đổi trạng thái US-004.

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

### Sprint 1B — Citation schema và reviewed graph bridge

**Mục tiêu:** tạo nền tảng dữ liệu citation-first trên D1 mà không tự đưa nội
dung pháp lý chưa duyệt vào production.

- [x] Tạo migration cho `legal_sources`, `legal_provisions` và quan hệ
  answer-citation theo US-015.
- [x] Thêm migration 0002 cho reviewed answer-citation relation, immutable
  provision revision, checksum/effectivity và stale-review invalidation.
- [x] Thêm validation `official_url`/authority theo DEC-004; source ngoài allowlist không
  được publish.
- [x] Thêm expand-only migration và runbook preflight/verify/restore/rollback.
- [x] Schema/migration/allowlist/four-eyes/revision/invalidation tests chạy
  17/17 pass, 0 skip.
- [ ] Apply migration trên production D1: **BLOCKED** vì Sites `project_id`
  không resolve và control plane chưa chứng minh migration-before-activation.
- [x] Full build, typecheck, lint và rendered/auth/chat suite đã pass.

**Out of scope:** seed, backfill hoặc mapping Nghị định 341/2025/NĐ-CP trong
Sprint 1B.

### Sprint 1D — Editorial trust primitives

**Mục tiêu:** tạo sidecar identity-neutral cho role, revision, review decision
và audit trước khi chọn/nối identity provider.

- [x] US-013: principal/role grant và database four-eyes constraints.
- [x] US-014: immutable revision/decision/audit + operation uniqueness.
- [x] US-021: migration từ 0000→0003, legacy fail-closed và negative tests.
- [x] Code review không còn blocker/high/medium trong phạm vi slice.

**Out of scope:** credential/session implementation, CMS/API/UI, graph
promotion, archive, production migration và retriever/chat integration.

### Milestone 0 — Quyết định và điều kiện đầu vào

- [x] CR-001: xác minh từ nguồn chính thức rằng Nghị định 131/2013/NĐ-CP hết
  hiệu lực toàn bộ từ 15/02/2026.
- [x] Chốt Cloudflare Worker + D1 là production primary.
- [x] Chốt evidence composer chỉ diễn giải evidence đã truy xuất; DEC-010 cho
  phép boundary web-search riêng sau no-match với official-citation guard.
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

- [ ] US-023: nhận API docs/export URL, approved terms/license, quota và update
  semantics của provider cụ thể.
- [x] US-023: registry + spike mapping một official sample vào draft
  source/provision và quyết định scoped go/no-go; 8/8 focused tests pass.
- [x] **Spec only / US-024:** refine AC và technical contract cho durable
  green-source gate, job/raw/candidate/quarantine, fetch/upload guard,
  at-least-once queue, retention/tombstone và safe telemetry trước code.
- [x] **Partial / US-024:** pure local fixture planner tạo frozen draft-only
  plan, không persistence/network/AI; 7/7 focused tests pass.
- [ ] US-024: triển khai migration, raw store, connector/consumer và integration
  fixtures theo spec; không check implementation từ evidence tài liệu.

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
- [x] US-009: sửa taxonomy/ranking cho ảnh riêng tư và bản quyền.
- [x] US-005: hoàn thiện showcase public.
- [ ] US-025: FTS5/structured retrieval, evidence bundle và golden-set eval.
- [x] **Partial / US-025:** ranked provision-candidate foundation đã có và fail
  closed với graph legacy; chưa phải validated evidence bundle hoặc runtime
  retrieval.
- [ ] US-026: evidence-bound AI composer và failure-path guards.
- [x] **Partial / US-026:** adapter foundation đã triển khai cô lập, feature
  flag off mặc định, chỉ nhận validated non-empty evidence bundle và chưa nối
  `/api/chat`.
- [ ] Chỉ shadow trên fixture/corpus đã qua review; production cutover sau khi
  Milestone 2 hoàn tất.

### Milestone 4 — Production hardening

- [x] US-018: password hash, secret rotation và env cleanup.
- [ ] **Partial / US-019:** local D1 limiter và route guards; production gate
  chưa đạt.
- [ ] **Partial / US-020:** local logging, privacy, correlation và runbook;
  production Workers Logs gate chưa đạt.
- [ ] US-022: deploy runbook và smoke test trên platform đã chốt.
- [ ] Provision AI budget/key/telemetry và chỉ bật feature flag sau shadow eval.

## Verification evidence

### 2026-07-31 — US-028 reviewed web-candidate vertical slice

- Spec/AC và DEC-011 được ghi trước code. Migration 0005 tạo immutable
  candidate/source/revision/event cùng atomic UTC-day token budget; không có
  raw-question/message field.
- `/api/chat` retrieve reviewed candidate trước live search, reserve/settle
  budget và chỉ trả web result sau khi candidate draft được lưu thành công.
  Provider telemetry chỉ có stable outcome/model/token/candidate ID.
- Session v2 hỗ trợ server-only multi-account registry, ký username +
  `principalId`; candidate API luôn đọc active role grant từ D1 và từ chối
  actor/role client tự khai.
- CMS có biên tập citation/effectivity, submit, approve/reject/archive và
  history. Database + API enforce independent reviewer, immutable history,
  optimistic version và official intake-source binding.
- Focused `tests/web-search-candidates.test.mjs`: **4/4**; combined
  auth/web/candidate: **24/24**; full local: **230/230**. TypeScript no-emit,
  ESLint và Vinext build 5/5: **pass**. Artifact có migration 0005 + journal.
- Production chưa đánh xong: Sites/D1 migration-before-code, distinct principal
  provisioning, actual header/concurrency/log smoke, Workers Logs retention,
  data-control và under-18 review cần bằng chứng bên ngoài.

### 2026-07-31 — US-027 allowed-source web fallback

- DEC-010 và US-027 được ghi trước implementation: RAG/managed/curated luôn
  chạy trước; web search là fallback riêng có rollback flag. DEC-011 sau đó cho
  phép persist draft có kiểm soát nhưng vẫn cấm auto-publish.
- `lib/openai-web-search.ts` dùng Responses API hosted `web_search`,
  `tool_choice=required`, `store=false`, fixed domain filter, complete sources,
  `search_context_size=low`, strict model/config/timeout/body parsing và
  redaction câu hỏi cuối.
- `lib/official-source-url.ts` là URL guard dùng chung cho server/UI: chỉ HTTPS
  exact authority `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` hoặc subdomain
  Chính phủ; credentials/port/domain giả bị loại. `thuvienphapluat.vn` không có
  trong direct domain list và chỉ dành cho backoffice discovery.
- `/api/chat` trả `mode=web_search` chỉ sau no-match; UI hiển thị nhãn chưa
  kiểm duyệt và link official mở an toàn. Flag mặc định vẫn false trong
  `.env.example`.
- Focused suite **12/12**, full suite **224/224**, typecheck, ESLint và Vinext
  build 5 environment: **pass**.
- Live technical smoke bằng câu hỏi giao thông không chứa dữ liệu người dùng:
  **success**, requested alias `gpt-5.4-mini`, observed
  `gpt-5.4-mini-2026-03-17`, hai official source host `vbpl.moj.gov.vn` và
  `chinhphu.vn`, 8.631 input + 265 output = **8.896 tokens**. Smoke chỉ in
  aggregate an toàn, không in key hoặc nội dung câu trả lời.
- US-027 giữ `Partial`: production vẫn cần bật flag có kiểm soát và hoàn tất
  data-control/under-18 disclosure, budget, rate-limit/telemetry và rollout
  review. Thư Viện Pháp Luật chưa được phê duyệt terms/license để ingest hoặc
  làm citation.

### 2026-07-31 — US-026 offline/local AI shadow implementation

- `lib/openai-evidence.ts` chuyển default/exact allowlist sang
  `gpt-5.4-mini|gpt-5.4-mini-2026-03-17`, trim outer whitespace và từ chối
  `gpt-5.6-sol`, family-like ID hoặc provider-returned model ngoài allowlist.
- Timeout bao trọn fetch + streaming body read. Content-length và byte stream
  đều bị chặn ở 1 MB; body treo/vượt giới hạn và mọi provider/schema failure
  trả stable code, không lộ raw body hoặc exception.
- `lib/ai-shadow.ts` chỉ bật với exact `AI_SHADOW_ENABLED=true`, bỏ qua
  `AI_REPHRASE_ENABLED`, snapshot config/fixture trước async boundary, verify
  committed fixture checksum + structural review labels, giới hạn case/quota,
  no retry, discard composition và chỉ trả aggregate content-free. Module/runner
  không được import vào `/api/chat`.
- Fixture/runner/config nằm tại `fixtures/ai-shadow/cases.v1.json`,
  `scripts/shadow-openai-evidence.mjs`, `.env.example`,
  `cloudflare-env.d.ts` và `package.json`.
- Focused suites: `tests/ai-shadow.test.mjs` **9/9 pass** và
  `tests/openai-evidence.test.mjs` **20/20 pass**; combined **29/29 pass**.
  Regression mới xác nhận cấu hình RPM được tài liệu hóa là `30` hợp lệ nhưng
  hard cap mỗi batch vẫn tối đa 20 case. `tsc --noEmit`, ESLint,
  `git diff --check`, Vinext build 5 environment và full local suite
  **212/212**: **pass**.
- Exact runner command với `.env.local` trả aggregate `DISABLED`, exit 1 và
  không outbound vì shadow flag absent/false. Manual live smoke sau đó bật flag
  process-only, dùng đúng technical fixture: **2/2 success** với allowlisted
  alias request `gpt-5.4-mini`; provider thực tế trả pinned snapshot
  `gpt-5.4-mini-2026-03-17`, 1.069 input + 453 output = **1.522 tokens**.
  Aggregate tách requested/observed model và không chứa key, prompt, evidence
  hay composition. US-026 giữ `Partial`;
  evidence này không đóng production bundle, retrieval/semantic quality,
  ZDR/MAM/under-18, route-shadow hoặc direct-answer gate.
- Product review chỉ check các AC local/offline có evidence: adapter config và
  technical failure tests; exact shadow flag/model; checksum-bound synthetic
  fixture; no-route baseline isolation; discard/content-free aggregate; fixture
  suite và live-smoke separation. Production rate-limit/budget, authenticated
  validated bundle, semantic validator, ZDR/under-18, `waitUntil` và direct AI
  giữ unchecked.

### 2026-07-31 — US-026/US-004 AI shadow pre-implementation specification

- DEC-009 phân biệt adapter foundation, offline shadow/local activation, route
  shadow và direct `ai_assisted`. Key hiện có không tự bật provider; canonical
  offline-runner flag là `AI_SHADOW_ENABLED=false`, và runner không import vào
  chat/API.
- Model drift được ghi nhận trước code: `.env.example` dùng
  `gpt-5.4-mini` nhưng adapter chỉ allowlist/default `gpt-5.6-sol`, nên config
  hiện fail trước outbound. Exact policy mới cho alias
  `gpt-5.4-mini` và snapshot `gpt-5.4-mini-2026-03-17`; implementation/tests
  vẫn chưa có.
- Shadow chỉ nhận validated reviewed evidence, dùng `store:false`, không
  web/tool, không persist prompt/output và không thay exact baseline
  response/citation/status/header ở success hoặc failure.
- Fixture test tự động và live smoke manual là evidence độc lập; live smoke
  không chứng minh retrieval, safety/evaluation hoặc quyền direct response.
- Route shadow vẫn blocked bởi production validated bundle/output guard và
  `waitUntil`/execution-lifetime seam; offline runner evidence không đóng gate
  này.
- Official data-control review xác nhận `store:false` không đồng nghĩa ZDR;
  abuse-monitoring logs mặc định có thể giữ customer content tới 30 ngày.
  Under-18 gate và exact-project ZDR/MAM verification chưa có implementation/
  operational evidence, nên các AC này giữ unchecked.
- Tại checkpoint pre-implementation này chưa có source/test cho shadow
  orchestration. Evidence implementation được ghi riêng phía trên; US-026 và
  US-004 vẫn giữ `Partial`.

### 2026-07-31 — US-017 local catalog resolver slice

- `lib/catalog-resolver.ts` triển khai pure `catalog-resolver-v1`, không I/O và
  không mutate input: validate `contentKey`, static eligibility, managed
  override/managed-only, draft/pending isolation và deterministic ordering.
- Resolver phân biệt `available_records|available_empty|unavailable`.
  Success-empty vẫn resolve static overlay ở trạng thái ready; dependency
  unavailable chỉ được dùng suppression snapshot độc lập đã verify, nếu không
  trả empty degraded.
- Suppression snapshot bind policy/catalog/snapshot version, creator khác
  reviewer về mặt label, review/expiry window và SHA-256 canonical payload.
  Digest không khóa chỉ kiểm toàn vẹn; slice không xác thực actor hay chứng minh
  four-eyes. Mọi managed record non-eligible phải có matching tombstone, nếu
  thiếu thì fail closed, nếu có thì bị ẩn bất kể lifecycle status.
- Duplicate/collision/orphan, malformed record/mapping, scalar/fallback mutation
  qua async boundary đều có regression; output được freeze và mọi
  `failed_closed` được public factory map sang degraded/no-store mà không lộ
  internal reason/issues.
- `node --experimental-strip-types --test tests/catalog-resolver.test.mjs`:
  **20/20 pass**; current full local suite: **198/198 pass**; `tsc --noEmit`,
  focused ESLint, Vinext build và `git diff --check`: **pass**.
- Slice này không thêm migration, D1 ledger/backfill, route, page hoặc chat
  activation, cũng chưa có authenticated reviewed ledger hoặc export
  signature/MAC. US-005 vẫn giữ contract 503 hiện tại cho dependency error và
  US-017 giữ `Partial` cho tới khi production activation gate có evidence.

### 2026-07-31 — US-005 public showcase slice

- `lib/public-showcase.ts` là public-boundary projector: chỉ nhận record
  `published` có stable positive integer ID, topic/title/summary hợp lệ và
  `sourceUrl` HTTPS đúng exact authority DEC-004; duplicate/invalid record bị
  loại, item hợp lệ giữ nguyên thứ tự API.
- `app/api/content/route.ts` query deterministic theo `updatedAt,id`; dependency
  failure trả `503`, stable error code và `Cache-Control: no-store`, không giả
  thành success-empty.
- `components/ShowcaseGallery.tsx` và `app/page.tsx` render toàn bộ DTO theo
  stable ID, đủ topic/title/summary/source; tách
  `loading|ready|empty|degraded`. Detail dialog mở đúng item, đóng bằng
  button/Escape, có minimal focus trap, initial focus và trả focus về trigger.
- `tests/public-showcase.test.mjs`: **15/15 pass** cho 0/1/3 item, API order,
  draft/invalid-source/extraneous-field exclusion, distinct UI states,
  modal/reducer/Escape/focus recovery và dependency failure. Full suite:
  **198/198 pass**; `tsc --noEmit`, ESLint,
  Vinext build và `git diff --check`: **pass**.
- Slice này không merge static/managed và không thay identity/resolver; US-017
  vẫn sở hữu canonical `contentKey`, override/suppression và degraded fallback.

### 2026-07-31 — US-024 local fixture planning slice

- `lib/ingestion-local.ts` v2 nhận exact four-field `local_fixture` request, tự
  resolve canonical static registry + committed JSON manifest và chỉ nhận exact
  `official/yellow/conditional_go` có matching `sampleRef`. Caller truyền
  `fixture`, registry, base URL, allowlist, credential, quota hoặc limit đều bị
  từ chối.
- Request và validated fixture được copy/freeze trước async boundary; test mutate
  input sau invocation không đổi provider/sample/actor trong plan. Static import
  bind sample ref với artifact repository, không dùng caller bytes.
- Planner tái sử dụng `mapOfficialSampleToDraft`; SHA-256 idempotency v2 dùng
  4-byte big-endian length prefix trên policy/provider/sample ref và mọi field
  fixture. Table test giữ nguyên original text nhưng đổi từng metadata field đều
  tạo identity khác; mutation sau khi bắt đầu hash không đổi key.
- Output deep-frozen, source/provision/candidate chỉ `draft`,
  `persistence=none`, `rawSnapshotRef=null`. Error chỉ có stable code/message,
  không echo input/cause; production/forged source, sample mismatch, malformed
  request và unknown policy/secret/URL override đều fail closed.
- `node --experimental-strip-types --test tests/ingestion-local.test.mjs`:
  **7/7 pass**; current full local suite: **198/198 pass**; `tsc --noEmit`, ESLint và
  Vinext build: **pass**.
- `docs/INGESTION_LOCAL_RUNBOOK.md` ghi exact four-field contract, trusted
  manifest, snapshot boundary, idempotency v2, redacted error và toàn bộ
  production gates còn mở.
- Không thêm migration, route, fetch, env, D1, R2, Queue, OpenAI hoặc production
  claim. US-024 chuyển `Todo` → `Partial`; durable ingestion vẫn chưa triển khai.

### 2026-07-31 — US-020 finding closure và US-024 pre-implementation audit

- US-020 có thêm AC chưa check buộc runtime US-025/US-026 phải truyền canonical
  answer/provision/citation IDs và provider outcome/latency/usage từ structured
  metadata; integration/query smoke phải đối chiếu D1/response và cùng
  `requestId`. Local telemetry evidence cũ không được dùng để check AC này;
  story giữ `Partial`.
- Trước khi có code US-024, `docs/PRODUCT_REQUIREMENTS.md`,
  `docs/USER_STORIES.md` và `docs/TECHNICAL_SPEC.md` đã chốt các gap còn thiếu:
  chỉ durable `active/green` source được production ingest; trusted trigger và
  server-side policy; R2 checksum/retention/legal hold; manual-upload content
  gate; queue at-least-once + lease/CAS/DLQ/crash-resume; upstream tombstone;
  safe telemetry/audit và expanded negative fixtures.
- Đây là requirement/spec evidence, không phải implementation evidence. Tại
  thời điểm pre-implementation audit, US-024 giữ `Todo`; local slice mới phía
  trên chỉ chuyển story thành `Partial`. PROP-001 và production activation vẫn
  chờ owner quyết định/xác minh.

### 2026-07-31 — US-020 local-safe observability slice

- `lib/telemetry.ts` chỉ serialize typed exact allowlist `telemetry-v1`, UUID v4,
  bounded duration/token/version/internal IDs và stable outcome; unknown hoặc
  invalid optional field bị loại, invalid required event bị drop. Sink contract
  là synchronous-only; synchronous throw không đổi HTTP result.
- `lib/worker-observability.ts` và `worker/index.ts` tạo/ghi đè correlation UUID
  ở outer Worker, truyền vào route/response và phát `http.response_ready`.
  Event này đo handler-to-headers/TTFB proxy, không phải stream completion.
  Login/chat phát đúng một event route; rate-limit chỉ dùng UUID nội bộ, không dùng
  `CF-Ray`. Chat phân biệt `retrieval_no_match` mà không log question hoặc tạo
  record/citation ID từ answer.
- `docs/OBSERVABILITY_RUNBOOK.md` ghi policy Workers Logs 100% sampling/3 ngày,
  least privilege/no export, query recipes, UTC/sampling caveat, alert owner,
  no-secret canary, correlation smoke và rollback. Đây là policy/runbook local,
  chưa phải evidence cấu hình production.
- `node --experimental-strip-types --test tests/telemetry.test.mjs`: **12/12
  pass**; bao phủ exact allowlist/bounds, PII/secret canary, safe error mapping,
  outer overwrite/propagation/uniqueness, rate-limit correlation, retrieval
  no-match, 200/400/401/403/429/503 và sink failure.
- `tsc --noEmit`: **pass**; ESLint: **pass**; Vinext build: **pass**; full local
  suite: **124/124 pass**.
- **Gate còn mở:** chưa xác minh đúng Sites project đã bật Workers Logs,
  sampling/retention/access, response-to-log correlation, production no-secret
  canary, query/alert smoke, canonical record/citation correlation hoặc provider
  telemetry. US-020 giữ `Partial`.

### 2026-07-31 — US-019 local-safe rate-limit slice

- `drizzle/0004_rate_limit_v1.sql` tạo bucket/penalty expand-only với strict
  scope/hash/state checks và expiry indexes; migration được thêm sau 0003 trong
  journal, không được runtime bootstrap ngầm.
- `lib/rate-limit.ts` dùng `CF-Connecting-IP`, IPv6 `/64`, scope-separated
  HMAC-SHA-256, atomic client/account/pair-attempt pre-PBKDF2 reservation, D1
  batch + UPSERT/RETURNING, fixed windows UTC, separately scoped pair penalty,
  state-version CAS reset và bounded lazy cleanup. Mọi batch item được validate;
  route trả generic 429/503 +
  `Retry-After` + `Cache-Control: no-store` trước auth/retrieval.
- `node --experimental-strip-types --test tests/rate-limit.test.mjs`: focused
  suite **15/15 pass**, bao phủ migration/idempotency,
  threshold/rollover/backoff/reset,
  isolation, HMAC/no-raw-data, missing dependency, concurrent atomicity,
  cleanup, telemetry allowlist và route short-circuit.
- `tsc --noEmit`: **pass**; Vinext build: **pass**; full local suite:
  **102/102 pass**. Production chưa deploy.
- **Gate còn mở:** actual D1 chưa có bằng chứng apply 0004 before code;
  `CF-Connecting-IP`, concurrent smoke, telemetry sink/retention và production
  thresholds chưa được xác minh/phê duyệt; scheduled sweep chưa chứng minh
  physical retention. US-019 giữ `Partial`.

### 2026-07-31 — US-018 password-hash slice

- `node --experimental-strip-types --test tests/admin-auth.test.mjs`: **6/6
  pass**. Coverage gồm hash đúng/sai, version/iteration/base64/field malformed,
  cấu hình thiếu, session secret ngắn, plaintext legacy bị bỏ qua, login route
  và invalidation cookie sau khi rotate session secret.
- `tsc --noEmit`: **pass** sau khi dùng Worker-compatible Web Crypto
  `BufferSource`.
- Vinext build: **pass**; `tests/rendered-html.test.mjs`: **15/15 pass** sau khi
  chuyển fixture login/session sang `ADMIN_PASSWORD_HASH`.
- `docs/ADMIN_CREDENTIAL_ROTATION.md` mô tả generate, cutover, invalidate cookie,
  smoke test và rollback không khôi phục session secret cũ. Benchmark PBKDF2
  600.000 vòng trên Worker production-like vẫn là rollout gate.

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
- Tại vòng US-026 ngày 2026-07-30, full build/rendered suite chưa chạy vì
  workspace chưa sẵn dependency; giới hạn này được đóng bằng build pass ở vòng
  US-025 ngày 2026-07-31 bên dưới.

### 2026-07-31 — US-025 candidate foundation slice

- `node --experimental-strip-types --test
  tests/legal-evidence-retriever.test.mjs`: **14/14 pass**.
- Coverage gồm Vietnamese normalization/exact-token matching, missing/malformed
  policies, four-eyes/relation/revision/effectivity/freshness/URL gates, date và
  TTL boundaries, deterministic ranking/ties, provision dedupe trước top-k,
  threshold/no-match, scan-overflow và canonical-conflict fail-closed, immutable
  policy snapshot, output-metadata validation, D1 canonical join fixture,
  dependency failure và static isolation khỏi chat/OpenAI/FTS.
- SQLite/D1 fixture chứng minh graph hiện tại load được nhưng bị
  `NO_ELIGIBLE_CANDIDATES` vì answer/citation là `legacy_unverified` và
  provision thiếu revision/effectivity. Không dùng fixture policy làm production
  policy.
- `node_modules/.bin/tsc --noEmit`: **pass**.
- `node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next`:
  **pass**.
- `node_modules/.bin/vinext build`: **pass**; toàn bộ 5 client/server/RSC/SSR
  environment build thành công.
- Regression: `tests/openai-evidence.test.mjs` **15/15 pass** và
  `tests/schema-foundation.test.mjs` **13/13 pass**.

### 2026-07-31 — US-025 reviewed graph bridge slice

- `node --test tests/schema-foundation.test.mjs`: **17/17 pass**. Coverage mới:
  0002 giữ legacy rows, review actor/creator immutability, provision revision
  format/uniqueness/immutability, exact citation binding và invalidation khi
  answer/source/provision thay đổi. Regression đóng đường bypass
  `demote answer → edit → reapprove` mà không re-review citation.
- `node --experimental-strip-types --test
  tests/legal-evidence-retriever.test.mjs`: **16/16 pass**. Coverage mới:
  canonical `provision-sha256-v1`, checksum mutation, canonical 0002 D1 mapping,
  legacy no-candidate và fully reviewed fixture có internal candidate.
- `tests/openai-evidence.test.mjs`: **15/15 pass**;
  `tests/rendered-html.test.mjs`: **15/15 pass**.
- `node_modules/.bin/tsc --noEmit`, ESLint và vinext build 5 environment:
  **pass**.
- Local fixture/raw SQL chỉ chứng minh constraint và mapper. Không chứng minh
  actor/RBAC/audit production, corpus đã được duyệt hoặc migration 0002 đã chạy
  trên production D1.

### 2026-07-31 — US-013/US-014 editorial trust-primitives slice

- `drizzle/0003_editorial_trust_primitives.sql` tạo bảy bảng sidecar
  principal/role/subject/revision/request/decision/audit; không seed credential,
  principal, role, legal content và không backfill/promote graph 0002.
- `tests/editorial-workflow-schema.test.mjs`: **13/13 pass**. Coverage gồm
  migration 0000→0003 giữ nguyên legacy, bootstrap admin duy nhất, admin-gated
  grant và one-way revoke, subject/revision creator guards, optimistic state
  transition, creator-only submit, self-review/stale revision, approve/reject
  atomic audit, duplicate operation, published revision swap, forged/cross-bound
  audit, one-sided hash và immutable history.
- Full local suite `node --test tests/*.test.mjs`: **76/76 pass**.
- TypeScript `--noEmit`, ESLint, `git diff --check` và Vinext build đủ 5
  environment: **pass**.
- Review bốn mắt phát hiện direct lifecycle/revision swap, mutable role trust
  root, forged audit và unsafe runtime auto-migration trong vòng đầu. Sau
  hardening/repro lại, final review: **không còn blocker/high/medium** trong
  phạm vi slice.
- `db/index.ts` không tự apply 0003. Production vẫn **BLOCKED** cho tới khi
  Sites control plane chứng minh migration ledger apply 0000→0003 trước
  activation. Sidecar chưa phải authenticated RBAC runtime và chưa làm graph
  đủ điều kiện RAG.

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
