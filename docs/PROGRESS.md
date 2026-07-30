# Progress Tracker — Luật Học Đường

> Cập nhật gần nhất: 2026-07-29  
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
| Hỏi đáp có kiểm soát | 2 | 2 | 0 | 0 |
| Quản trị nội dung | 3 | 1 | 1 | 0 |
| Dữ liệu và nguồn | 0 | 3 | 0 | 0 |
| Bảo mật, vận hành, chất lượng | 0 | 3 | 2 | 0 |
| **Tổng** | **7** | **12** | **3** | **0** |

## Theo dõi theo user story

| Story | Priority | Status | Owner | Evidence / next gap | Last updated |
|---|---|---|---|---|---|
| US-001 — Tra cứu theo từ khóa và chủ đề | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-002 — Xem căn cứ, mức xử lý và ví dụ | P0 | Done | Full-stack | `app/page.tsx`; `lib/legal-content.ts` | 2026-07-29 |
| US-003 — Nguồn chính thức theo từng citation | P0 | Partial | Full-stack + PM | Có source list ở `lib/legal-content.ts`; thiếu mapping source/provision/answer | 2026-07-29 |
| US-004 — Câu trả lời đầy đủ có cấu trúc | P0 | Partial | Full-stack | Data nền có các thành phần; API vẫn trả `{answer, mode}` dạng text | 2026-07-29 |
| US-005 — Showcase public đầy đủ | P1 | Partial | Full-stack | `app/page.tsx` chỉ dùng title của hai item đầu; chưa render summary/source/topic | 2026-07-29 |
| US-006 — Chat ưu tiên kho kiến thức | P0 | Done | Full-stack | `app/api/chat/route.ts`; `lib/legal-chat.ts`; tests | 2026-07-29 |
| US-007 — Fail closed ngoài phạm vi | P0 | Done | Full-stack | `app/api/chat/route.ts`; regression tests | 2026-07-29 |
| US-008 — Guard citation/mức phạt của AI | P0 | Partial | Full-stack + Code review | `app/api/chat/route.ts` đã gỡ ungrounded provider call; no-match trả `unavailable`. Evidence-bound AI composition/citation validation chưa triển khai; regression mới là definition, chưa chạy | 2026-07-29 |
| US-009 — Phân biệt ảnh riêng tư/bản quyền | P0 | Partial | Full-stack + Code review | Branch `hình ảnh` → copyright đã gỡ khỏi `lib/legal-chat.ts`; chưa có intent/ranking riêng và test đủ hai intent | 2026-07-29 |
| US-010 — Auth khu vực quản trị | P0 | Done | Full-stack + Code review | `lib/admin-auth.ts`; admin routes; auth tests | 2026-07-29 |
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
| US-021 — Backend/workflow E2E tests | P0 | Partial | Full-stack + Code review | `tests/schema-foundation.test.mjs` 13/13 pass, 0 skip. Full build/rendered suite không chạy do thiếu `node_modules`/`dist`; chưa có public/retrieval D1 E2E | 2026-07-29 |
| US-022 — Runtime/deploy thống nhất | P0 | Partial | PM + Full-stack | Migration/runbook có local evidence, nhưng production **BLOCKED**: Sites `project_id` không resolve và migration control-plane behavior chưa xác minh; chưa smoke test | 2026-07-29 |

## Thứ tự triển khai đề xuất

### Decision Log

| Ngày | ID | Quyết định | Story |
|---|---|---|---|
| 2026-07-29 | DEC-001 | Cloudflare Worker + D1 là production primary. | US-022 |
| 2026-07-29 | DEC-002 | Ngoài kho đã duyệt trả `unavailable`; AI chỉ diễn giải evidence đã truy xuất. | US-008 |
| 2026-07-29 | DEC-003 | Bắt buộc quy trình bốn mắt `editor != reviewer`. | US-013 |
| 2026-07-29 | DEC-004 | Chỉ publish source thuộc `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` và subdomain chính thức. | US-015, US-016 |

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

### Milestone 1 — Citation product integration

- [ ] US-003: expose citation có URL và metadata qua API/UI.
- [ ] US-016: tích hợp metadata hiệu lực/invalidation vào public/chat retrieval.
- [ ] US-017: migrate/seed dữ liệu nền và quy tắc deduplicate.

### Milestone 2 — Answer contract và retrieval

- [ ] US-004: chuyển API/UI sang response có cấu trúc.
- [ ] US-008: chỉ gắn citation/mức phạt từ record đã truy xuất.
- [ ] US-009: sửa taxonomy/ranking cho ảnh riêng tư và bản quyền.
- [ ] US-005: hoàn thiện showcase public.

### Milestone 3 — Editorial workflow

- [ ] US-013: roles và state machine review.
- [ ] US-014: revisions/audit và archive.
- [ ] US-021: test `draft → review → publish → public/chat`.

### Milestone 4 — Production hardening

- [ ] US-018: password hash, secret rotation và env cleanup.
- [ ] US-019: rate limit login/chat.
- [ ] US-020: logging, privacy và observability.
- [ ] US-022: deploy runbook và smoke test trên platform đã chốt.

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
