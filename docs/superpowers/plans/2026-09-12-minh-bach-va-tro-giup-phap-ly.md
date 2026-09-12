# GĐ1 — Minh bạch độ chính xác và Trợ giúp pháp lý: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi câu trả lời của cổng đều mang khuyến cáo độ chính xác lấy từ một nguồn câu chữ duy nhất, và người dùng có một trang trợ giúp pháp lý chỉ ra cơ quan có thẩm quyền theo từng lĩnh vực bằng dữ liệu đã duyệt.

**Architecture:** Hai khối độc lập nhau về dữ liệu. Khối minh bạch là thuần trình bày: một module câu chữ (`lib/ai-disclosure.ts`), một component (`components/AiDisclaimer.tsx`), và một lần tách thân câu trả lời chat ra khỏi `app/page.tsx` để hai bề mặt chat dùng chung đúng một thứ tự DOM. Khối trợ giúp pháp lý thêm một bảng dữ liệu đã duyệt (`referral_authorities`), một hàm thuần dựng chuỗi leo thang, một endpoint đọc, và một trang mới gọi lại `POST /api/chat` hiện có thay vì dựng pipeline thứ hai.

**Tech Stack:** Next.js 16 (App Router) + React 19 trên vinext/Cloudflare Workers; Drizzle ORM với hai schema song song (SQLite `db/schema.ts`, Neon Postgres `db/pg-schema.ts` + DDL thật ở `db/pg-bootstrap.ts`); TypeScript 5.9; CSS thuần theo token trong `app/styles/`; test bằng `node --test` + `tsx/esm/api` hoặc `registerHooks`.

**Spec:** `docs/superpowers/specs/2026-09-12-nang-cap-chuc-nang-duyet-design.md` (phần “GĐ1 — Minh bạch và trợ giúp pháp lý”, quyết định DEC-020 và DEC-022).

**User stories:** US-038 (khuyến cáo độ chính xác), US-039 (mục trợ giúp pháp lý) trong `docs/USER_STORIES.md` — Epic H. Dòng sheet tương ứng: #7 và #6.

## Global Constraints

- **DEC-020 — một nguồn câu chữ.** Câu khuyến cáo độ chính xác chỉ được định nghĩa trong `lib/ai-disclosure.ts`. Không một tệp nào khác được viết chuỗi khuyến cáo mới; mọi bề mặt render qua `components/AiDisclaimer.tsx`.
- **DEC-022 — cơ quan là dữ liệu đã duyệt.** AI không được sinh tên, địa chỉ, số điện thoại cơ quan. Thiếu dữ liệu cho một lĩnh vực thì dùng đầu mối mặc định đã kiểm chứng trong `fallbackReferralAuthorities`, không suy diễn.
- **DEC-002 / DEC-005 — fail-closed.** Không thêm nhánh nào làm chat trả lời khi không có bằng chứng. Trang trợ giúp pháp lý gọi lại `createChatHandler` nguyên vẹn, không nhân bản pipeline evidence.
- **DEC-014 — migration expand-only.** Thêm bảng/cột thì: (a) thêm vào `db/schema.ts` và `db/pg-schema.ts`, (b) thêm DDL idempotent vào `db/pg-bootstrap.ts`, (c) **tăng `pgSchemaVersion`**, (d) thêm file `drizzle/000N_*.sql` + entry trong `drizzle/meta/_journal.json`. Không DROP, không đổi kiểu cột đang có dữ liệu, không seed trong migration.
- **DEC-004 — allowlist nguồn chính thống.** Link “mở nguồn” chỉ đi qua `lib/official-source-url.ts`; host hợp lệ: `vbpl.vn`, `vbpl.moj.gov.vn`, `chinhphu.vn` và `*.chinhphu.vn`.
- **Không bịa căn cứ.** Không thêm mức phạt, số hiệu văn bản, điều khoản mới ở bất kỳ tệp nào trong GĐ1.
- **Không `dangerouslySetInnerHTML`**, không `innerHTML`. Guard test hiện có (`tests/openai-web-search.test.mjs`) kiểm tra điều này.
- **Định danh:** không thêm cookie, không thu tên/lớp/số điện thoại. Trang trợ giúp pháp lý không có đăng nhập.
- **Kích thước tệp:** ≤ 800 dòng. `app/page.tsx` đang 1113 dòng — mọi task chạm tệp này phải làm nó **ngắn đi**, không dài thêm.
- **Tiếng Việt trong code:** comment và chuỗi hiển thị viết tiếng Việt có dấu, theo đúng lối các tệp hiện có. Tên test viết không dấu (theo lệ `tests/*.test.mjs`).
- **GitNexus (CLAUDE.md):** chạy `impact({target, direction: "upstream"})` trước khi sửa mỗi symbol đã tồn tại; chạy `detect_changes()` trước mỗi commit. Không rename bằng find-and-replace.
- **Chạy test:** từng tệp bằng `node --experimental-strip-types --test tests/<tên>.test.mjs`; toàn bộ bằng `npm test` (chạy `vinext build` trước rồi `node --test tests/*.test.mjs`).
- **Commit message** kết thúc bằng hai dòng:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
  ```
- **Không tick `[x]` trong `docs/USER_STORIES.md` khi chưa có bằng chứng** (đường dẫn tệp + tên test đã chạy) ghi vào `docs/PROGRESS.md`.

---

## File Structure

**Tạo mới**

| Tệp | Trách nhiệm |
|---|---|
| `lib/ai-disclosure.ts` | Nguồn duy nhất của câu chữ khuyến cáo; map `AnswerOrigin` → mức khuyến cáo. Thuần, không import React. |
| `components/AiDisclaimer.tsx` | Trình bày khuyến cáo (đầy đủ hoặc gọn). Không tự sinh câu chữ. |
| `app/styles/disclaimer.css` | Style cho `.ai-disclaimer`, hai mức `reviewed` / `unverified`. |
| `lib/chat-answer-view.ts` | Đổi payload `POST /api/chat` thành một view model duy nhất. Thuần, có test. |
| `components/ChatAnswerBody.tsx` | Thân một câu trả lời trợ lý: nhãn nguồn → khuyến cáo → cảnh báo → nội dung → nguồn. Dùng chung cho hộp chat và trang trợ giúp pháp lý. |
| `lib/authority-referral.ts` | Kiểu `ReferralAuthority`, thang cấp, dựng chuỗi leo thang, đầu mối mặc định. Thuần, không gọi mạng/DB. |
| `lib/authority-store.ts` | Đọc `referral_authorities` đã publish từ Postgres và map sang `ReferralAuthority`. |
| `app/api/co-quan/route.ts` | `GET /api/co-quan?topic=` — chuỗi đầu mối đã duyệt, có nhánh degraded. |
| `components/ReferralChain.tsx` | Khối “Gửi đến đâu” hiển thị chuỗi leo thang. |
| `components/LegalAidConsult.tsx` | Client component của trang trợ giúp pháp lý: ô nhập tình huống, gọi `/api/chat`, render `ChatAnswerBody` + `ReferralChain`. |
| `app/tro-giup-phap-ly/page.tsx` | Vỏ server component + metadata cho `/tro-giup-phap-ly`. |
| `app/styles/legal-aid.css` | Style trang trợ giúp pháp lý và khối chuỗi đầu mối. |
| `drizzle/0007_referral_authorities.sql` | Migration SQLite expand-only. |
| `tests/ai-disclosure.test.mjs`, `tests/chat-answer-view.test.mjs`, `tests/authority-referral.test.mjs`, `tests/legal-aid-surface.test.mjs` | Test tương ứng. |

**Sửa**

| Tệp | Thay đổi |
|---|---|
| `lib/openai-web-search.ts:40-44` | `WEB_SEARCH_WARNING` / `REFERENCE_SEARCH_WARNING` trỏ về `lib/ai-disclosure.ts`, không giữ bản thứ hai. |
| `lib/official-source-url.ts:121-142` | `warningTitle` của `publicSourceUiCopy` lấy từ `disclosureFor("live_web").title`. |
| `components/SituationAnswer.tsx` | Gắn `AiDisclaimer` sau ba khối trả lời. |
| `app/dieu-luat/[id]/page.tsx` | Thay phần trùng lặp của `modal-note` bằng `AiDisclaimer`. |
| `app/page.tsx` | Rút thân bong bóng trả lời và phần đọc payload ra ngoài; footer hộp chat dùng `AiDisclaimer` gọn; `helpHotlines` viết cứng đổi thành đọc `/api/co-quan` với fallback tĩnh; thêm link tới `/tro-giup-phap-ly`. |
| `app/globals.css` | `@import` hai tệp CSS mới. |
| `db/schema.ts`, `db/pg-schema.ts`, `db/pg-bootstrap.ts`, `drizzle/meta/_journal.json` | Bảng `referral_authorities` + tăng `pgSchemaVersion`. |
| `app/api/chat/route.ts` | Thêm trường `topic` vào payload trả về (thêm trường, không đổi hành vi). |
| `tests/openai-web-search.test.mjs` | Cập nhật guard thứ tự DOM sang `components/ChatAnswerBody.tsx` và `warningTitle` mới. |
| `docs/USER_STORIES.md`, `docs/PROGRESS.md`, `docs/TECHNICAL_SPEC.md` | Bằng chứng và ghi nhận DEC-020/DEC-022. |

**Thứ tự:** Task 1 → 2 → 3 dựng khối minh bạch (không chạm database). Task 4 → 5 → 6 → 7 → 8 dựng khối trợ giúp pháp lý. Task 3 phải xong trước Task 8 vì trang trợ giúp pháp lý dùng `ChatAnswerBody`.

---

### Task 1: Nguồn câu chữ khuyến cáo duy nhất

**Files:**
- Create: `lib/ai-disclosure.ts`
- Create: `tests/ai-disclosure.test.mjs`
- Modify: `lib/openai-web-search.ts:37-44`
- Modify: `lib/official-source-url.ts:121-142`
- Modify: `tests/openai-web-search.test.mjs:360-366`

**Interfaces:**
- Consumes: `lib/answer-origin.ts` — `answerOrigins`, `type AnswerOrigin = "library" | "grounded_library" | "reviewed_web" | "live_web"`.
- Produces:
  - `export const disclosureLevels = ["reviewed", "unverified"] as const`
  - `export type DisclosureLevel = (typeof disclosureLevels)[number]`
  - `export type AiDisclosure = Readonly<{ level: DisclosureLevel; title: string; body: string; actionLabel: string }>`
  - `export const reviewedDisclosure: AiDisclosure`
  - `export const unverifiedDisclosure: AiDisclosure`
  - `export function disclosureFor(origin: AnswerOrigin | null): AiDisclosure`
  - `export const unverifiedOfficialSourceWarning: string`
  - `export const unverifiedReferenceSourceWarning: string`

- [ ] **Step 1: Write the failing test**

Create `tests/ai-disclosure.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  disclosureFor,
  disclosureLevels,
  reviewedDisclosure,
  unverifiedDisclosure,
  unverifiedOfficialSourceWarning,
  unverifiedReferenceSourceWarning,
} = await import("../lib/ai-disclosure.ts");
const { answerOrigins } = await import("../lib/answer-origin.ts");
const { WEB_SEARCH_WARNING, REFERENCE_SEARCH_WARNING } = await import(
  "../lib/openai-web-search.ts"
);
const { publicSourceUiCopy } = await import("../lib/official-source-url.ts");

test.after(async () => {
  await unregisterTsx();
});

test("moi nguon tra loi deu co mot muc khuyen cao", () => {
  for (const origin of answerOrigins) {
    const disclosure = disclosureFor(origin);
    assert.ok(disclosureLevels.includes(disclosure.level));
    assert.ok(disclosure.title.length > 0);
    assert.ok(disclosure.body.length > 0);
    assert.ok(disclosure.actionLabel.length > 0);
  }
});

test("chi nhanh tra cuu truc tiep bi danh dau chua kiem duyet", () => {
  assert.equal(disclosureFor("live_web").level, "unverified");
  assert.equal(disclosureFor("library").level, "reviewed");
  assert.equal(disclosureFor("grounded_library").level, "reviewed");
  assert.equal(disclosureFor("reviewed_web").level, "reviewed");
  // Không biết nguồn thì vẫn phải có khuyến cáo, mức thận trọng mặc định.
  assert.equal(disclosureFor(null).level, "reviewed");
});

test("cau khuyen cao noi ro khong bao dam va khong la can cu phap ly", () => {
  assert.match(unverifiedDisclosure.body, /không bảo đảm chính xác 100%/);
  assert.match(unverifiedDisclosure.body, /không dùng làm căn cứ pháp lý/);
  assert.match(reviewedDisclosure.body, /đối chiếu/);
});

test("khuyen cao la object dong bang nen khong noi nao sua duoc cau chu", () => {
  assert.ok(Object.isFrozen(reviewedDisclosure));
  assert.ok(Object.isFrozen(unverifiedDisclosure));
});

test("cac module khac lay cau chu tu day chu khong tu viet lai", () => {
  assert.equal(WEB_SEARCH_WARNING, unverifiedOfficialSourceWarning);
  assert.equal(REFERENCE_SEARCH_WARNING, unverifiedReferenceSourceWarning);
  assert.equal(
    publicSourceUiCopy("reference", true).warningTitle,
    unverifiedDisclosure.title,
  );
  assert.equal(
    publicSourceUiCopy("official", true).warningTitle,
    unverifiedDisclosure.title,
  );
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test tests/ai-disclosure.test.mjs`
Expected: FAIL — `Cannot find module '.../lib/ai-disclosure.ts'`.

- [ ] **Step 3: Create `lib/ai-disclosure.ts`**

```ts
// Nguồn câu chữ duy nhất cho khuyến cáo độ chính xác của nội dung do AI tạo
// (US-038, DEC-020). Trước đây câu khuyến cáo nằm rải ở footer hộp chat,
// `modal-note` của trang điều luật và hai hằng cảnh báo trong
// `lib/openai-web-search.ts`, nên sửa một chỗ là lệch ba chỗ còn lại. Mọi bề
// mặt phải đọc từ đây; không tệp nào được viết lại câu khuyến cáo của riêng nó.
import type { AnswerOrigin } from "./answer-origin";

export const disclosureLevels = ["reviewed", "unverified"] as const;

export type DisclosureLevel = (typeof disclosureLevels)[number];

export type AiDisclosure = Readonly<{
  level: DisclosureLevel;
  title: string;
  body: string;
  // Nhãn của liên kết mở nguồn gốc; trình bày dùng lại, không tự đặt tên khác.
  actionLabel: string;
}>;

// Nội dung đã qua duyệt bốn mắt: vẫn phải nhắc người đọc đối chiếu văn bản gốc
// vì mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.
export const reviewedDisclosure: AiDisclosure = Object.freeze({
  level: "reviewed",
  title: "Thông tin tham khảo, cần đối chiếu văn bản gốc",
  body: "Nội dung được biên soạn để học tập và đã qua duyệt nội bộ, nhưng không thay thế tư vấn pháp lý. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể — hãy đối chiếu văn bản gốc trước khi áp dụng.",
  actionLabel: "Mở văn bản gốc",
});

// Nhánh tra cứu trực tiếp bên ngoài: chưa qua kiểm duyệt của cổng nên câu chữ
// phải nói thẳng hai điều — không bảo đảm chính xác, và không dùng làm căn cứ.
export const unverifiedDisclosure: AiDisclosure = Object.freeze({
  level: "unverified",
  title: "Kết quả AI chưa được kiểm duyệt",
  body: "Phần trả lời này do AI tra cứu tự động, chưa qua quy trình kiểm duyệt nội dung của cổng nên không bảo đảm chính xác 100% và không dùng làm căn cứ pháp lý. Hãy mở nguồn bên dưới hoặc hỏi cơ quan có thẩm quyền trước khi áp dụng.",
  actionLabel: "Mở nguồn để kiểm tra",
});

const disclosureByOrigin: Record<AnswerOrigin, AiDisclosure> = {
  library: reviewedDisclosure,
  grounded_library: reviewedDisclosure,
  reviewed_web: reviewedDisclosure,
  live_web: unverifiedDisclosure,
};

// `null` xảy ra khi câu trả lời không mang nhãn nguồn (nhánh fail-closed, lỗi
// mạng). Vẫn trả về khuyến cáo chứ không trả về null: không bề mặt nào được
// phép hiển thị nội dung AI mà thiếu khuyến cáo.
export function disclosureFor(origin: AnswerOrigin | null): AiDisclosure {
  return origin ? disclosureByOrigin[origin] : reviewedDisclosure;
}

// Hai câu cảnh báo đi kèm payload chat của nhánh tra cứu ngoài. Chúng dài hơn
// `unverifiedDisclosure.body` vì còn phân biệt nguồn Chính phủ với nguồn tham
// khảo, nhưng vẫn thuộc cùng một bộ câu chữ nên phải sống ở tệp này.
export const unverifiedOfficialSourceWarning =
  "Đây là kết quả AI tra cứu trực tuyến từ nguồn Chính phủ và chưa đi qua quy trình kiểm duyệt nội dung của cổng. Bạn nên mở nguồn bên dưới để kiểm tra trước khi áp dụng.";

export const unverifiedReferenceSourceWarning =
  "Đây là kết quả AI từ nguồn tham khảo ngoài, không phải nguồn chính thống và chưa được cổng kiểm duyệt. Bạn cần xác minh lại bằng văn bản hoặc cơ quan chính thức trước khi áp dụng.";
```

- [ ] **Step 4: Point `lib/openai-web-search.ts` at the new module**

Run `impact({target: "WEB_SEARCH_WARNING", direction: "upstream"})` first and report the blast radius.

Add the import next to the existing imports at the top of the file:

```ts
import {
  unverifiedOfficialSourceWarning,
  unverifiedReferenceSourceWarning,
} from "./ai-disclosure";
```

Replace lines 40-44 (the two `export const ... =` string literals) with re-exports that keep the public names byte-identical:

```ts
// DEC-020: câu chữ sống ở `lib/ai-disclosure.ts`. Hai tên này giữ nguyên vì
// route chat và test đang import chúng.
export const WEB_SEARCH_WARNING = unverifiedOfficialSourceWarning;
export const REFERENCE_SEARCH_WARNING = unverifiedReferenceSourceWarning;
```

- [ ] **Step 5: Point `lib/official-source-url.ts` at the new module**

Run `impact({target: "publicSourceUiCopy", direction: "upstream"})` first and report the blast radius.

Add at the top of the file:

```ts
import { unverifiedDisclosure } from "./ai-disclosure";
```

In `publicSourceUiCopy`, replace both hand-written `warningTitle` values. The reference branch:

```ts
  if (sourceKind === "reference") {
    return {
      // DEC-020: tiêu đề khuyến cáo dùng chung một câu chữ cho cả hai nhánh.
      warningTitle: unverifiedDisclosure.title,
      groupTitle: "Nguồn tham khảo ngoài — cần xác minh",
      fallbackTitle: "Nguồn tham khảo",
      openAction: "Mở nguồn tham khảo ↗",
      openAriaPrefix: "Mở nguồn tham khảo cần xác minh",
    };
  }
```

And the official branch:

```ts
  return {
    warningTitle: unverifiedDisclosure.title,
    groupTitle: hasWarning
      ? "Nguồn chính thức đã tra cứu"
      : "Nguồn chính thức",
    fallbackTitle: "Văn bản Chính phủ",
    openAction: "Mở nguồn chính thức ↗",
    openAriaPrefix: "Mở nguồn chính thức",
  };
```

- [ ] **Step 6: Update the copy assertion in `tests/openai-web-search.test.mjs`**

The `deepEqual` at line 360 still pins the old title. Replace that assertion block with:

```js
  assert.deepEqual(publicSourceUiCopy("reference", true), {
    warningTitle: "Kết quả AI chưa được kiểm duyệt",
    groupTitle: "Nguồn tham khảo ngoài — cần xác minh",
    fallbackTitle: "Nguồn tham khảo",
    openAction: "Mở nguồn tham khảo ↗",
    openAriaPrefix: "Mở nguồn tham khảo cần xác minh",
  });
```

- [ ] **Step 7: Run both test files**

Run: `node --test tests/ai-disclosure.test.mjs tests/openai-web-search.test.mjs`
Expected: PASS (no failing subtests in either file).

- [ ] **Step 8: Commit**

Run `detect_changes()` first, then:

```bash
git add lib/ai-disclosure.ts lib/openai-web-search.ts lib/official-source-url.ts \
  tests/ai-disclosure.test.mjs tests/openai-web-search.test.mjs
git commit -m "$(cat <<'MSG'
feat: mot nguon cau chu khuyen cao do chinh xac (US-038, DEC-020)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 2: Component khuyến cáo và hai bề mặt tĩnh

**Files:**
- Create: `components/AiDisclaimer.tsx`
- Create: `app/styles/disclaimer.css`
- Modify: `app/globals.css:19` (thêm `@import`)
- Modify: `components/SituationAnswer.tsx`
- Modify: `app/dieu-luat/[id]/page.tsx` (khối `<p className="modal-note">` ở cuối)
- Test: `tests/situation-lookup.test.mjs` (thêm assertion vào test đang có)

**Interfaces:**
- Consumes: `disclosureFor`, `type AiDisclosure` từ Task 1; `ShieldIcon`, `ArrowUpRightIcon` từ `components/icons`.
- Produces: `export function AiDisclaimer(props: AiDisclaimerProps)` với
  ```ts
  type AiDisclaimerProps = Readonly<{
    origin?: AnswerOrigin | null;
    variant?: "full" | "compact";
    sourceUrl?: string;
  }>;
  ```
  Mặc định `origin = null`, `variant = "full"`, `sourceUrl = ""`.

- [ ] **Step 1: Write the failing test**

Append to `tests/situation-lookup.test.mjs` (the file already has the `register()` harness and imports `SituationAnswer`). Add the component import next to the existing ones:

```js
const { AiDisclaimer } = await import("../components/AiDisclaimer.tsx");
```

and append these tests at the end of the file:

```js
test("khuyen cao render role note va danh dau muc do tin cay", () => {
  const reviewed = renderToStaticMarkup(
    React.createElement(AiDisclaimer, { origin: "library" }),
  );
  assert.match(reviewed, /role="note"/);
  assert.match(reviewed, /data-level="reviewed"/);
  assert.match(reviewed, /Thông tin tham khảo, cần đối chiếu văn bản gốc/);

  const unverified = renderToStaticMarkup(
    React.createElement(AiDisclaimer, { origin: "live_web" }),
  );
  assert.match(unverified, /data-level="unverified"/);
  assert.match(unverified, /không bảo đảm chính xác 100%/);
  assert.match(unverified, /không dùng làm căn cứ pháp lý/);
});

test("khuyen cao mo nguon goc bang link an toan, khong co url thi khong co link", () => {
  const withSource = renderToStaticMarkup(
    React.createElement(AiDisclaimer, {
      origin: "library",
      sourceUrl: "https://vbpl.vn/tw/Pages/vbpq-toanvan.aspx?ItemID=173920",
    }),
  );
  assert.match(withSource, /target="_blank"/);
  assert.match(withSource, /rel="noopener noreferrer"/);
  assert.match(withSource, /Mở văn bản gốc/);

  const withoutSource = renderToStaticMarkup(
    React.createElement(AiDisclaimer, { origin: "library" }),
  );
  assert.doesNotMatch(withoutSource, /<a /);
});

test("ban gon chi giu mot dong nhung van la note", () => {
  const compact = renderToStaticMarkup(
    React.createElement(AiDisclaimer, { variant: "compact" }),
  );
  assert.match(compact, /role="note"/);
  assert.match(compact, /data-variant="compact"/);
  // Bản gọn không in tiêu đề in hoa để không chiếm chỗ trong hộp chat.
  assert.doesNotMatch(compact, /<strong>/);
});

test("khoi tra loi tinh huong luon keo theo khuyen cao", () => {
  const html = renderToStaticMarkup(
    React.createElement(SituationAnswer, {
      remedy: "Giữ bằng chứng.",
      penalty: "400.000 – 600.000đ",
      legalBasis: "Điều 7 Nghị định 168/2024/NĐ-CP",
      citationUrl: "https://vbpl.vn/tw/Pages/ivbpq-thuoctinh.aspx?ItemID=173920",
    }),
  );
  const listIndex = html.indexOf('<ol class="situation-answer">');
  const disclaimerIndex = html.indexOf('class="ai-disclaimer"');
  assert.ok(listIndex >= 0);
  assert.ok(disclaimerIndex > listIndex);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test tests/situation-lookup.test.mjs`
Expected: FAIL — `Cannot find module '.../components/AiDisclaimer.tsx'`.

- [ ] **Step 3: Create `components/AiDisclaimer.tsx`**

```tsx
// Khuyến cáo độ chính xác cho mọi nội dung do AI tạo (US-038, DEC-020).
// Component này KHÔNG tự viết câu chữ: toàn bộ nội dung đến từ
// `lib/ai-disclosure.ts` để một lần sửa câu là mọi bề mặt đổi theo.
import { disclosureFor } from "@/lib/ai-disclosure";
import type { AnswerOrigin } from "@/lib/answer-origin";
import { ArrowUpRightIcon, ShieldIcon } from "./icons";

type AiDisclaimerProps = Readonly<{
  // Nguồn của câu trả lời; không truyền nghĩa là chưa xác định và dùng mức
  // thận trọng mặc định.
  origin?: AnswerOrigin | null;
  // "compact" dùng ở chân hộp chat, nơi chỉ còn chỗ cho một dòng.
  variant?: "full" | "compact";
  // Link văn bản gốc, nếu bề mặt đó có. Rỗng thì không render link.
  sourceUrl?: string;
}>;

export function AiDisclaimer({
  origin = null,
  variant = "full",
  sourceUrl = "",
}: AiDisclaimerProps) {
  const disclosure = disclosureFor(origin);
  const trimmedUrl = sourceUrl.trim();
  return (
    <aside
      className="ai-disclaimer"
      role="note"
      data-level={disclosure.level}
      data-variant={variant}
    >
      <ShieldIcon aria-hidden="true" />
      <div>
        {variant === "full" && <strong>{disclosure.title}</strong>}
        <p>{disclosure.body}</p>
        {trimmedUrl.length > 0 && (
          <a href={trimmedUrl} target="_blank" rel="noopener noreferrer">
            {disclosure.actionLabel} <ArrowUpRightIcon />
          </a>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create `app/styles/disclaimer.css`**

```css
/* Khuyến cáo độ chính xác (US-038). Mức "unverified" phải nhận ra được từ xa
   nên dùng nền vàng cảnh báo + viền trái dày; mức "reviewed" giữ tông giấy để
   không làm người đọc mất tin vào nội dung đã duyệt. */

.ai-disclaimer {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--line-strong);
  background: var(--cream-warm);
  color: var(--ink-soft);
}

.ai-disclaimer > svg {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.ai-disclaimer > div {
  display: grid;
  gap: 6px;
}

.ai-disclaimer strong {
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ai-disclaimer p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.ai-disclaimer a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--brick-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color var(--duration-fast, 150ms) ease;
}

.ai-disclaimer a:hover,
.ai-disclaimer a:focus-visible {
  color: var(--brick-hover, var(--brick-deep));
}

.ai-disclaimer[data-level="unverified"] {
  border-left-color: var(--gold-deep);
  background: var(--gold-soft);
}

/* Bản gọn nằm ở chân hộp chat: bỏ nền, thu nhỏ chữ, không chiếm chiều cao. */
.ai-disclaimer[data-variant="compact"] {
  margin-top: 0;
  padding: 8px 0 0;
  border-left: 0;
  background: transparent;
}

.ai-disclaimer[data-variant="compact"] p {
  font-size: 0.75rem;
  line-height: 1.45;
}

@media (max-width: 420px) {
  .ai-disclaimer {
    grid-template-columns: minmax(0, 1fr);
  }
  .ai-disclaimer > svg {
    display: none;
  }
}
```

- [ ] **Step 5: Register the stylesheet**

Append one line to `app/globals.css`, after the `./styles/doc.css` import:

```css
@import "./styles/disclaimer.css";
```

- [ ] **Step 6: Attach the disclaimer to `components/SituationAnswer.tsx`**

Run `impact({target: "SituationAnswer", direction: "upstream"})` first and report the blast radius (expected: `app/page.tsx` only).

Add the import and wrap the return in a fragment so the existing `<ol class="situation-answer">` assertion keeps passing:

```tsx
import { AiDisclaimer } from "./AiDisclaimer";
```

```tsx
export function SituationAnswer(props: SituationAnswerInput) {
  const blocks = buildSituationAnswer(props);
  return (
    <>
      <ol className="situation-answer">
        {blocks.map((block) => {
          const PartIcon = partIcons[block.part];
          return (
            <li key={block.part} className="situation-part" data-part={block.part}>
              <span className="situation-step">
                <PartIcon />
              </span>
              <div>
                <h4>{block.title}</h4>
                <p>{block.body}</p>
                {block.url && (
                  <a href={block.url} target="_blank" rel="noopener noreferrer">
                    Mở nguồn chính thức <ArrowUpRightIcon />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {/* DEC-020: khối tình huống là nội dung diễn giải nên luôn đi kèm khuyến cáo. */}
      <AiDisclaimer origin="library" />
    </>
  );
}
```

- [ ] **Step 7: Replace the duplicated wording on the law detail page**

In `app/dieu-luat/[id]/page.tsx`, add the import:

```tsx
import { AiDisclaimer } from "@/components/AiDisclaimer";
```

and replace the closing `<p className="modal-note">…</p>` block with the provenance sentence plus the shared disclaimer — the accuracy wording is now owned by `lib/ai-disclosure.ts`:

```tsx
      <p className="modal-note">
        Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật.
      </p>
      <AiDisclaimer
        origin="library"
        sourceUrl={law.citation?.officialUrl ?? ""}
      />
```

- [ ] **Step 8: Run the tests**

Run: `node --test tests/situation-lookup.test.mjs tests/rendered-html.test.mjs`
Expected: PASS.

- [ ] **Step 9: Commit**

Run `detect_changes()` first, then:

```bash
git add components/AiDisclaimer.tsx app/styles/disclaimer.css app/globals.css \
  components/SituationAnswer.tsx "app/dieu-luat/[id]/page.tsx" tests/situation-lookup.test.mjs
git commit -m "$(cat <<'MSG'
feat: component khuyen cao dung chung cho tinh huong va trang dieu luat (US-038)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 3: Thân câu trả lời chat dùng chung

Trang trợ giúp pháp lý (Task 8) phải render câu trả lời chat giống hộp chat ở trang chủ. Hiện toàn bộ logic đó nằm inline trong `app/page.tsx` (~150 dòng trong một tệp đã 1113 dòng). Task này rút phần đọc payload và phần trình bày ra hai đơn vị có test riêng, rồi cắm khuyến cáo vào đúng vị trí đầu tiên của thân câu trả lời.

**Files:**
- Create: `lib/chat-answer-view.ts`
- Create: `components/ChatAnswerBody.tsx`
- Create: `tests/chat-answer-view.test.mjs`
- Modify: `app/page.tsx` (type `ChatMessage`, `submitChatQuestion`, khối `chat-messages`, dòng chân hộp chat)
- Modify: `tests/openai-web-search.test.mjs` (guard thứ tự DOM đang trỏ vào `app/page.tsx`)

**Interfaces:**
- Consumes: `AiDisclaimer` (Task 2); `parseChatAnswerSections`, `parseChatFollowUps`, `chatAnswerSectionTitle`, `type ChatAnswerSection` từ `lib/chat-answer-presentation`; `parsePublicSourceLinks`, `publicSourceUiCopy`, `type OfficialSourceLink`, `type PublicSourceKind` từ `lib/official-source-url`; `answerOriginCopyOf`, `parseAnswerOrigin`, `type AnswerOrigin` từ `lib/answer-origin`; `isContentTopic`, `type ContentTopic` từ `lib/topics`.
- Produces:
  ```ts
  export type ChatAnswerView = Readonly<{
    answer: string;
    mode: string;
    warning: string | null;
    sections: readonly ChatAnswerSection[] | null;
    sources: readonly OfficialSourceLink[];
    sourceKind: PublicSourceKind;
    answerOrigin: AnswerOrigin | null;
    followUps: readonly string[];
    topic: ContentTopic | null;
  }>;
  export function parseChatAnswerPayload(value: unknown): ChatAnswerView;
  export const chatAnswerFallbackText: string;
  export const chatAnswerNetworkErrorText: string;
  ```
  và `export function ChatAnswerBody(props: Readonly<{ answer: ChatAnswerView }>)`.

- [ ] **Step 1: Write the failing test**

Create `tests/chat-answer-view.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  chatAnswerFallbackText,
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
} = await import("../lib/chat-answer-view.ts");
const { ChatAnswerBody } = await import("../components/ChatAnswerBody.tsx");

test.after(async () => {
  await unregisterTsx();
});

test("payload thieu answer thi dung cau du phong chu khong render undefined", () => {
  const view = parseChatAnswerPayload({ mode: "unavailable" });
  assert.equal(view.answer, chatAnswerFallbackText);
  assert.equal(view.warning, null);
  assert.equal(view.sections, null);
  assert.deepEqual(view.sources, []);
  assert.deepEqual(view.followUps, []);
  assert.equal(view.answerOrigin, null);
  assert.equal(view.topic, null);
  assert.ok(chatAnswerNetworkErrorText.length > 0);
});

test("loi tra ve tu server duoc dung lam noi dung tra loi", () => {
  const view = parseChatAnswerPayload({
    error: "Bạn hãy nhập một câu hỏi trước nhé.",
  });
  assert.equal(view.answer, "Bạn hãy nhập một câu hỏi trước nhé.");
});

test("chi nhanh web_search moi giu canh bao, sourceKind reference doi dung parser", () => {
  const view = parseChatAnswerPayload({
    answer: "Kết luận: hãy đối chiếu nguồn.",
    mode: "web_search",
    warning: "Cảnh báo từ server.",
    sourceKind: "reference",
    answerOrigin: "live_web",
    sources: [
      { title: "Bài tham khảo", url: "https://thuvienphapluat.vn/van-ban/x" },
    ],
  });
  assert.equal(view.warning, "Cảnh báo từ server.");
  assert.equal(view.sourceKind, "reference");
  assert.equal(view.answerOrigin, "live_web");
  assert.equal(view.sources.length, 1);

  // Nhánh knowledge không mang cảnh báo, và sourceKind lạ rơi về official.
  const knowledge = parseChatAnswerPayload({
    answer: "Kết luận: theo kho nội dung.",
    mode: "knowledge",
    warning: "Không được hiển thị.",
    sourceKind: "reference",
    sources: [{ title: "Nguồn", url: "https://vbpl.vn/van-ban" }],
    followUps: ["Hỏi tiếp câu này?"],
    topic: "Giao thông",
  });
  assert.equal(knowledge.warning, null);
  assert.equal(knowledge.sourceKind, "official");
  assert.equal(knowledge.sources.length, 1);
  assert.deepEqual(knowledge.followUps, ["Hỏi tiếp câu này?"]);
  assert.equal(knowledge.topic, "Giao thông");
});

test("linh vuc khong thuoc bo chu de bi bo qua", () => {
  const view = parseChatAnswerPayload({ mode: "knowledge", topic: "Hôn nhân" });
  assert.equal(view.topic, null);
});

test("than cau tra loi dat khuyen cao truoc canh bao va truoc noi dung", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatAnswerBody, {
      answer: parseChatAnswerPayload({
        answer: "Kết luận: hãy đối chiếu nguồn.",
        mode: "web_search",
        warning: "Cảnh báo từ server.",
        answerOrigin: "live_web",
        sources: [{ title: "Nguồn Chính phủ", url: "https://vbpl.vn/van-ban" }],
      }),
    }),
  );
  const originIndex = html.indexOf('class="chat-origin"');
  const disclaimerIndex = html.indexOf('class="ai-disclaimer"');
  const warningIndex = html.indexOf('class="chat-warning"');
  const bodyIndex = html.indexOf("Kết luận: hãy đối chiếu nguồn.");
  const sourcesIndex = html.indexOf('class="chat-source-group"');
  assert.ok(originIndex >= 0);
  assert.ok(originIndex < disclaimerIndex);
  assert.ok(disclaimerIndex < warningIndex);
  assert.ok(warningIndex < bodyIndex);
  assert.ok(bodyIndex < sourcesIndex);
  assert.match(html, /data-level="unverified"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("tra loi khong co nhan nguon van co khuyen cao", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatAnswerBody, {
      answer: parseChatAnswerPayload({
        answer: "Câu này chưa có trong dữ liệu đã duyệt.",
        mode: "unavailable",
      }),
    }),
  );
  assert.match(html, /class="ai-disclaimer"/);
  assert.match(html, /data-level="reviewed"/);
  assert.doesNotMatch(html, /class="chat-origin"/);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test tests/chat-answer-view.test.mjs`
Expected: FAIL — `Cannot find module '.../lib/chat-answer-view.ts'`.

- [ ] **Step 3: Create `lib/chat-answer-view.ts`**

```ts
// View model của một câu trả lời chat (US-038, US-039). Trước đây phần đọc
// payload nằm inline trong `app/page.tsx`; trang trợ giúp pháp lý cần đúng
// cách đọc đó nên logic được rút ra đây để hai bề mặt không lệch nhau.
import {
  parseChatAnswerSections,
  parseChatFollowUps,
  type ChatAnswerSection,
} from "./chat-answer-presentation";
import {
  parsePublicSourceLinks,
  type OfficialSourceLink,
  type PublicSourceKind,
} from "./official-source-url";
import { parseAnswerOrigin, type AnswerOrigin } from "./answer-origin";
import { isContentTopic, type ContentTopic } from "./topics";

export type ChatAnswerView = Readonly<{
  answer: string;
  mode: string;
  warning: string | null;
  sections: readonly ChatAnswerSection[] | null;
  sources: readonly OfficialSourceLink[];
  sourceKind: PublicSourceKind;
  answerOrigin: AnswerOrigin | null;
  followUps: readonly string[];
  topic: ContentTopic | null;
}>;

export const chatAnswerFallbackText =
  "Mình chưa thể trả lời lúc này. Bạn thử lại sau nhé.";

export const chatAnswerNetworkErrorText =
  "Kết nối đang gián đoạn. Bạn thử gửi lại câu hỏi sau ít phút nhé.";

type ChatAnswerPayload = {
  answer?: unknown;
  error?: unknown;
  mode?: unknown;
  warning?: unknown;
  sourceKind?: unknown;
  answerOrigin?: unknown;
  sections?: unknown;
  sources?: unknown;
  followUps?: unknown;
  topic?: unknown;
};

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseChatAnswerPayload(value: unknown): ChatAnswerView {
  const payload = (value ?? {}) as ChatAnswerPayload;
  const mode = typeof payload.mode === "string" ? payload.mode : "";
  // sourceKind lạ hoặc thiếu phải rơi về parser official (nghiêm hơn) để một
  // URL tham khảo không bị dán nhãn nguồn chính thống.
  const sourceKind: PublicSourceKind =
    mode === "web_search" && payload.sourceKind === "reference"
      ? "reference"
      : "official";
  const carriesSources = mode === "web_search" || mode === "knowledge";
  const sources = carriesSources
    ? parsePublicSourceLinks(payload.sources, sourceKind)
    : [];
  const sections = carriesSources
    ? parseChatAnswerSections(payload.sections)
    : null;
  return Object.freeze({
    answer:
      textOf(payload.answer) ?? textOf(payload.error) ?? chatAnswerFallbackText,
    mode,
    // Cảnh báo chỉ thuộc nhánh tra cứu ngoài; nhánh kho nội bộ không được
    // mượn lại nó để tránh làm nhiễu mức độ tin cậy.
    warning: mode === "web_search" ? textOf(payload.warning) : null,
    sections,
    sources,
    sourceKind,
    answerOrigin: parseAnswerOrigin(payload.answerOrigin),
    followUps: mode === "knowledge" ? parseChatFollowUps(payload.followUps) : [],
    topic: isContentTopic(payload.topic) ? payload.topic : null,
  });
}
```

- [ ] **Step 4: Create `components/ChatAnswerBody.tsx`**

```tsx
// Thân một câu trả lời của trợ lý (US-038, US-039). Thứ tự DOM là hợp đồng:
// nhãn nguồn → khuyến cáo độ chính xác → cảnh báo của server → nội dung →
// nguồn dẫn. Khuyến cáo phải đứng trước nội dung để người đọc thấy nó trước
// khi đọc kết luận. Hộp chat trang chủ và trang trợ giúp pháp lý dùng cùng
// component này nên không thể lệch thứ tự.
import { AiDisclaimer } from "./AiDisclaimer";
import { SparkleIcon } from "./icons";
import { answerOriginCopyOf } from "@/lib/answer-origin";
import { chatAnswerSectionTitle } from "@/lib/chat-answer-presentation";
import { publicSourceUiCopy } from "@/lib/official-source-url";
import type { ChatAnswerView } from "@/lib/chat-answer-view";

export function ChatAnswerBody({
  answer,
}: Readonly<{ answer: ChatAnswerView }>) {
  const sourceCopy = publicSourceUiCopy(
    answer.sourceKind,
    Boolean(answer.warning),
  );
  const originCopy = answer.answerOrigin
    ? answerOriginCopyOf(answer.answerOrigin)
    : null;
  return (
    <>
      {originCopy && (
        <p
          className="chat-origin"
          data-origin={answer.answerOrigin}
          title={originCopy.detail}
        >
          <SparkleIcon />
          <span>Nguồn trả lời: {originCopy.label}</span>
        </p>
      )}
      <AiDisclaimer origin={answer.answerOrigin} variant="compact" />
      {answer.warning && (
        <p className="chat-warning" role="note">
          <strong>{sourceCopy.warningTitle}</strong>
          <span>{answer.warning}</span>
        </p>
      )}
      {answer.sections ? (
        <div className="chat-answer-sections">
          {answer.sections.map((section) => (
            <section
              key={section.kind}
              className={`chat-answer-section chat-answer-section-${section.kind.replaceAll("_", "-")}`}
              data-kind={section.kind}
            >
              <h3>{chatAnswerSectionTitle(section.kind)}</h3>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${section.kind}-p-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets.length > 0 && (
                <ul>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${section.kind}-b-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p>{answer.answer}</p>
      )}
      {answer.sources.length > 0 && (
        <div className="chat-source-group">
          <h3>{sourceCopy.groupTitle}</h3>
          <ul className="chat-sources">
            {answer.sources.map((source) => (
              <li key={source.url}>
                <span>{source.title || sourceCopy.fallbackTitle}</span>
                <small>{new URL(source.url).hostname}</small>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${sourceCopy.openAriaPrefix}: ${source.title || sourceCopy.fallbackTitle}`}
                >
                  {sourceCopy.openAction}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5: Run the new test to verify it passes**

Run: `node --test tests/chat-answer-view.test.mjs`
Expected: PASS.

- [ ] **Step 6: Rewire `app/page.tsx` to the shared pieces**

Run `impact({target: "submitChatQuestion", direction: "upstream"})` first and report the blast radius.

6a. Replace the chat-related imports. Remove `chatAnswerSectionTitle`, `parseChatAnswerSections`, `parseChatFollowUps`, `type ChatAnswerSection` from the `@/lib/chat-answer-presentation` import (drop the import entirely — `app/page.tsx` no longer uses any of them), remove `answerOriginCopyOf` from the `@/lib/answer-origin` import, remove `parsePublicSourceLinks` and `publicSourceUiCopy` plus `type OfficialSourceLink` and `type PublicSourceKind` from the `@/lib/official-source-url` import if nothing else in the file uses them (grep first: `grep -n "publicSourceUiCopy\|parsePublicSourceLinks\|OfficialSourceLink\|PublicSourceKind" app/page.tsx`), and add:

```tsx
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { ChatAnswerBody } from "@/components/ChatAnswerBody";
import {
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
  type ChatAnswerView,
} from "@/lib/chat-answer-view";
```

6b. Shrink the `ChatMessage` type (lines 81-90) to:

```tsx
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  // Câu trả lời của trợ lý; tin của người dùng không có view.
  view?: ChatAnswerView;
};
```

6c. Replace the body of the `try`/`catch` in `submitChatQuestion` (lines ~320-375) with:

```tsx
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: pendingMessages.slice(-8) }),
      });
      const view = parseChatAnswerPayload(await response.json());
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: view.answer, view },
      ]);
    } catch {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: chatAnswerNetworkErrorText },
      ]);
    } finally {
      setIsChatLoading(false);
    }
```

6d. Replace the whole `chatMessages.map(...)` block (lines ~970-1075) with:

```tsx
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`chat-message ${message.role}`}
                >
                  {message.view ? (
                    <ChatAnswerBody answer={message.view} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.view &&
                    message.view.followUps.length > 0 &&
                    index === chatMessages.length - 1 && (
                      <div className="chat-follow-ups">
                        <h3>Bạn có thể hỏi tiếp</h3>
                        <ul>
                          {message.view.followUps.map((followUp) => (
                            <li key={followUp}>
                              <button
                                type="button"
                                disabled={isChatLoading}
                                onClick={() =>
                                  void submitChatQuestion(undefined, followUp)
                                }
                              >
                                {followUp}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
```

6e. Replace the hand-written footer line of the chat panel (line ~1099, `<p>Nội dung chỉ để học tập, không thay thế tư vấn pháp lý.</p>`) with:

```tsx
          <AiDisclaimer variant="compact" />
```

- [ ] **Step 7: Re-point the DOM-order guard test**

In `tests/openai-web-search.test.mjs`, the guard reads `app/page.tsx`. Change the read to include the new component and assert on it. Replace the `readFile` pair with:

```js
  const [pageSource, bodySource, globalsSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/ChatAnswerBody.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
```

Replace the index block and the `pageSource` assertions that moved into the component with:

```js
  // Thứ tự DOM của thân câu trả lời giờ do ChatAnswerBody quyết định.
  const disclaimerIndex = bodySource.indexOf("<AiDisclaimer");
  const warningIndex = bodySource.indexOf("{answer.warning && (");
  const sectionsIndex = bodySource.indexOf("{answer.sections ? (");
  const sourcesIndex = bodySource.indexOf("{answer.sources.length > 0 && (");
  assert.ok(disclaimerIndex >= 0);
  assert.ok(disclaimerIndex < warningIndex);
  assert.ok(warningIndex < sectionsIndex);
  assert.ok(sectionsIndex < sourcesIndex);
  assert.match(bodySource, /publicSourceUiCopy\(/);
  assert.match(bodySource, /target="_blank"/);
  assert.match(bodySource, /rel="noopener noreferrer"/);
  assert.match(bodySource, /role="note"/);
  assert.match(bodySource, /data-kind=\{section\.kind\}/);
  assert.doesNotMatch(bodySource, /dangerouslySetInnerHTML/);
  assert.match(pageSource, /parseChatAnswerPayload\(/);
  assert.doesNotMatch(pageSource, /dangerouslySetInnerHTML/);
```

Keep the existing `cssSource` assertions unchanged, and add one for the new stylesheet:

```js
  assert.match(cssSource, /\.ai-disclaimer\[data-level="unverified"\]/);
```

- [ ] **Step 8: Run the affected tests and the build**

Run: `node --test tests/chat-answer-view.test.mjs tests/openai-web-search.test.mjs tests/rendered-html.test.mjs`
Expected: PASS.

Run: `npx vinext build`
Expected: build succeeds — this is what catches leftover references to the removed `ChatMessage` fields.

- [ ] **Step 9: Commit**

Run `detect_changes()` first, then:

```bash
git add lib/chat-answer-view.ts components/ChatAnswerBody.tsx app/page.tsx \
  tests/chat-answer-view.test.mjs tests/openai-web-search.test.mjs
git commit -m "$(cat <<'MSG'
refactor: tach than cau tra loi chat va cam khuyen cao vao dau khoi (US-038)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 4: Bảng `referral_authorities`

Dữ liệu cơ quan có thẩm quyền là dữ liệu đã duyệt, không phải nội dung AI sinh (DEC-022). Bảng đi qua đủ bốn chỗ theo DEC-014: schema SQLite, schema Postgres, DDL thật, migration file.

**Files:**
- Modify: `db/schema.ts` (thêm bảng, cuối khối nội dung pháp lý)
- Modify: `db/pg-schema.ts` (thêm bảng tương ứng)
- Modify: `db/pg-bootstrap.ts` (DDL + index + `pgSchemaVersion`)
- Create: `drizzle/0007_referral_authorities.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `tests/referral-authorities-schema.test.mjs`

**Interfaces:**
- Consumes: `sqliteTable`, `text`, `integer`, `index`, `check`, `sql` (đã import trong `db/schema.ts`); `pgTable`, `serial`, `text`, `sql` (đã import trong `db/pg-schema.ts`).
- Produces: `export const referralAuthorities` ở cả hai schema, với cột `id, name, level, topics, scope, address, phone, hotline, note, status, createdBy, reviewedBy, reviewedAt, createdAt, updatedAt`; `pgSchemaVersion = "2026-09-12-referral-authorities-v1"`.

- [ ] **Step 1: Write the failing test**

Create `tests/referral-authorities-schema.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

globalThis.__workerEnvStub ??= {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
      };
    }
    if (specifier === "@/db") {
      return {
        shortCircuit: true,
        url: new URL("../db/index.ts", import.meta.url).href,
      };
    }
    if (specifier.startsWith("@/")) {
      const suffix = specifier.endsWith(".json") ? "" : ".ts";
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}${suffix}`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const repositoryRoot = new URL("../", import.meta.url);
const [schemaSource, pgSchemaSource, migration, journalText] =
  await Promise.all([
    readFile(new URL("db/schema.ts", repositoryRoot), "utf8"),
    readFile(new URL("db/pg-schema.ts", repositoryRoot), "utf8"),
    readFile(
      new URL("drizzle/0007_referral_authorities.sql", repositoryRoot),
      "utf8",
    ),
    readFile(new URL("drizzle/meta/_journal.json", repositoryRoot), "utf8"),
  ]);
const journal = JSON.parse(journalText);
const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { sql } = await import("drizzle-orm");
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const { pgSchemaVersion } = await import("../db/pg-bootstrap.ts");

test("ca hai schema deu khai bao bang co quan", () => {
  assert.match(schemaSource, /sqliteTable\(\s*\n?\s*"referral_authorities"/);
  assert.match(pgSchemaSource, /pgTable\("referral_authorities"/);
});

test("migration duoc ghi vao journal dung thu tu, khong xoa gi", () => {
  const entry = journal.entries.at(-1);
  assert.equal(entry.idx, 7);
  assert.equal(entry.tag, "0007_referral_authorities");
  assert.doesNotMatch(migration, /DROP\s+TABLE/i);
  assert.doesNotMatch(migration, /DROP\s+COLUMN/i);
  // Migration chỉ tạo schema; dữ liệu cơ quan phải đi qua quy trình duyệt.
  assert.doesNotMatch(migration, /INSERT\s+INTO/i);
});

test("phien ban schema pg da duoc tang", () => {
  assert.equal(pgSchemaVersion, "2026-09-12-referral-authorities-v1");
});

test("sqlite chan cap sai, trang thai sai va topics khong phai json", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  const insert = (values) =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, scope, address, phone, hotline, note, status, created_by)
       VALUES (${values})`,
    );

  insert(
    `'Công an xã A', 'xa_phuong', '["An ninh trật tự"]', 'Xã A', '', '', '', '', 'draft', 'editor-1'`,
  );
  assert.throws(() =>
    insert(
      `'Sai cấp', 'quan_huyen', '[]', '', '', '', '', '', 'draft', 'editor-1'`,
    ),
  );
  assert.throws(() =>
    insert(`'Sai trạng thái', 'tinh', '[]', '', '', '', '', '', 'live', 'editor-1'`),
  );
  assert.throws(() =>
    insert(`'Topics sai', 'tinh', 'khong-phai-json', '', '', '', '', '', 'draft', 'editor-1'`),
  );
  assert.throws(() =>
    insert(`'   ', 'tinh', '[]', '', '', '', '', '', 'draft', 'editor-1'`),
  );
});

test("sqlite chi cho published khi da duyet boi nguoi khac", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  // Thiếu người duyệt.
  assert.throws(() =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, status, created_by)
       VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1')`,
    ),
  );
  // Tự duyệt bài của mình.
  assert.throws(() =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, status, created_by, reviewed_by, reviewed_at)
       VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1', 'editor-1', '2026-09-12')`,
    ),
  );
  db.exec(
    `INSERT INTO referral_authorities
     (name, level, topics, status, created_by, reviewed_by, reviewed_at)
     VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1', 'reviewer-1', '2026-09-12')`,
  );
  const row = db
    .prepare(`SELECT status, level FROM referral_authorities`)
    .get();
  assert.equal(row.status, "published");
  assert.equal(row.level, "tinh");
});

test("bootstrap postgres tao bang va giu dung rang buoc", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);
  // Idempotent: chạy lần hai không được lỗi.
  await bootstrapLegalDatabase(db);

  await db.execute(
    sql.raw(
      `INSERT INTO referral_authorities (name, level, topics, status, created_by)
       VALUES ('Công an phường B', 'xa_phuong', '["An ninh trật tự"]', 'draft', 'editor-1')`,
    ),
  );
  await assert.rejects(() =>
    db.execute(
      sql.raw(
        `INSERT INTO referral_authorities (name, level, topics, status, created_by)
         VALUES ('Sai cấp', 'quan_huyen', '[]', 'draft', 'editor-1')`,
      ),
    ),
  );
  await assert.rejects(() =>
    db.execute(
      sql.raw(
        `INSERT INTO referral_authorities (name, level, topics, status, created_by)
         VALUES ('Chua duyet', 'tinh', '[]', 'published', 'editor-1')`,
      ),
    ),
  );
  await client.close();
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test tests/referral-authorities-schema.test.mjs`
Expected: FAIL — `ENOENT` for `drizzle/0007_referral_authorities.sql`.

- [ ] **Step 3: Add the table to `db/schema.ts`**

Append after `legalEntryCitations`:

```ts
// Cơ quan tiếp nhận theo thẩm quyền (US-039, DEC-022). Đây là dữ liệu do
// người biên soạn nhập và người khác duyệt — AI không được sinh tên, địa chỉ
// hay số điện thoại cơ quan. `topics` rỗng nghĩa là đầu mối chung cho mọi
// lĩnh vực ở cấp đó.
export const referralAuthorities = sqliteTable(
  "referral_authorities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    level: text("level", {
      enum: ["truong", "xa_phuong", "huyen", "tinh", "trung_uong"],
    }).notNull(),
    topics: text("topics").notNull().default("[]"),
    scope: text("scope").notNull().default(""),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    hotline: text("hotline").notNull().default(""),
    note: text("note").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    createdBy: text("created_by").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("referral_authorities_status_level_idx").on(table.status, table.level),
    check(
      "referral_authorities_level_check",
      sql`${table.level} in ('truong', 'xa_phuong', 'huyen', 'tinh', 'trung_uong')`,
    ),
    check(
      "referral_authorities_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
    check(
      "referral_authorities_name_check",
      sql`length(trim(${table.name})) between 1 and 200`,
    ),
    check(
      "referral_authorities_topics_json_check",
      sql`json_valid(${table.topics})
        and json_type(${table.topics}) = 'array'
        and length(${table.topics}) <= 512`,
    ),
    check(
      "referral_authorities_contact_length_check",
      sql`length(${table.phone}) <= 40
        and length(${table.hotline}) <= 40
        and length(${table.address}) <= 300
        and length(${table.scope}) <= 200
        and length(${table.note}) <= 300`,
    ),
    // DEC-003: bản published phải do người khác duyệt, không tự duyệt.
    check(
      "referral_authorities_four_eyes_check",
      sql`${table.status} != 'published' or (
        ${table.reviewedBy} is not null
        and ${table.reviewedAt} is not null
        and ${table.reviewedBy} != ${table.createdBy}
      )`,
    ),
  ],
);
```

- [ ] **Step 4: Add the table to `db/pg-schema.ts`**

Append after `legalEntryCitations` (the CHECKs live in `db/pg-bootstrap.ts`, per the file header):

```ts
// Cơ quan tiếp nhận theo thẩm quyền (US-039, DEC-022). CHECK thật nằm ở
// db/pg-bootstrap.ts.
export const referralAuthorities = pgTable("referral_authorities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: text("level", {
    enum: ["truong", "xa_phuong", "huyen", "tinh", "trung_uong"],
  }).notNull(),
  topics: text("topics").notNull().default("[]"),
  scope: text("scope").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  hotline: text("hotline").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdBy: text("created_by").notNull(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});
```

- [ ] **Step 5: Add the real DDL to `db/pg-bootstrap.ts`**

5a. Add the statement next to the other `createXTable` constants:

```ts
const createReferralAuthoritiesTable = `
CREATE TABLE IF NOT EXISTS referral_authorities (
  id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name text NOT NULL,
  level text NOT NULL,
  topics text DEFAULT '[]' NOT NULL,
  scope text DEFAULT '' NOT NULL,
  address text DEFAULT '' NOT NULL,
  phone text DEFAULT '' NOT NULL,
  hotline text DEFAULT '' NOT NULL,
  note text DEFAULT '' NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  created_by text NOT NULL,
  reviewed_by text,
  reviewed_at text,
  created_at text DEFAULT (now())::text NOT NULL,
  updated_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT referral_authorities_level_check
    CHECK (level IN ('truong', 'xa_phuong', 'huyen', 'tinh', 'trung_uong')),
  CONSTRAINT referral_authorities_status_check
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT referral_authorities_name_check
    CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  CONSTRAINT referral_authorities_topics_json_check
    CHECK (
      topics::jsonb IS NOT NULL
      AND jsonb_typeof(topics::jsonb) = 'array'
      AND length(topics) <= 512
    ),
  CONSTRAINT referral_authorities_contact_length_check
    CHECK (
      length(phone) <= 40
      AND length(hotline) <= 40
      AND length(address) <= 300
      AND length(scope) <= 200
      AND length(note) <= 300
    ),
  CONSTRAINT referral_authorities_four_eyes_check
    CHECK (status <> 'published' OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND reviewed_by <> created_by
    ))
)`;
```

5b. Add the index to `indexStatements`:

```ts
  `CREATE INDEX IF NOT EXISTS referral_authorities_status_level_idx
   ON referral_authorities (status, level)`,
```

5c. Add `createReferralAuthoritiesTable` to `pgBootstrapStatements`, right after `createLegalEntryCitationsTable` — it must come before `...indexStatements`.

5d. Bump the version (without this, an existing database skips the new DDL):

```ts
export const pgSchemaVersion = "2026-09-12-referral-authorities-v1";
```

- [ ] **Step 6: Create `drizzle/0007_referral_authorities.sql`**

Bản spec đặt tên `drizzle/0007_legal_document_library.sql` cho GĐ2. GĐ1 ship trước nên chiếm số 0007; migration của GĐ2 lùi thành `0008_legal_document_library.sql` (ghi lại điều này khi lập plan GĐ2).

```sql
CREATE TABLE `referral_authorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`hotline` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "referral_authorities_level_check" CHECK("referral_authorities"."level" in ('truong', 'xa_phuong', 'huyen', 'tinh', 'trung_uong')),
	CONSTRAINT "referral_authorities_status_check" CHECK("referral_authorities"."status" in ('draft', 'published')),
	CONSTRAINT "referral_authorities_name_check" CHECK(length(trim("referral_authorities"."name")) between 1 and 200),
	CONSTRAINT "referral_authorities_topics_json_check" CHECK(json_valid("referral_authorities"."topics")
        and json_type("referral_authorities"."topics") = 'array'
        and length("referral_authorities"."topics") <= 512),
	CONSTRAINT "referral_authorities_contact_length_check" CHECK(length("referral_authorities"."phone") <= 40
        and length("referral_authorities"."hotline") <= 40
        and length("referral_authorities"."address") <= 300
        and length("referral_authorities"."scope") <= 200
        and length("referral_authorities"."note") <= 300),
	CONSTRAINT "referral_authorities_four_eyes_check" CHECK("referral_authorities"."status" != 'published' or (
        "referral_authorities"."reviewed_by" is not null
        and "referral_authorities"."reviewed_at" is not null
        and "referral_authorities"."reviewed_by" != "referral_authorities"."created_by"
      ))
);
--> statement-breakpoint
CREATE INDEX `referral_authorities_status_level_idx` ON `referral_authorities` (`status`,`level`);
```

- [ ] **Step 7: Add the journal entry**

In `drizzle/meta/_journal.json`, append to `entries` after the `idx: 6` object:

```json
    {
      "idx": 7,
      "version": "6",
      "when": 1789171200000,
      "tag": "0007_referral_authorities",
      "breakpoints": true
    }
```

- [ ] **Step 8: Run the tests**

Run: `node --test tests/referral-authorities-schema.test.mjs tests/pg-bootstrap.test.mjs tests/schema-foundation.test.mjs`
Expected: PASS.

- [ ] **Step 9: Commit**

Run `detect_changes()` first, then:

```bash
git add db/schema.ts db/pg-schema.ts db/pg-bootstrap.ts \
  drizzle/0007_referral_authorities.sql drizzle/meta/_journal.json \
  tests/referral-authorities-schema.test.mjs
git commit -m "$(cat <<'MSG'
feat: bang co quan tiep nhan theo tham quyen (US-039, DEC-022)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 5: `lib/authority-referral.ts` — chuỗi chuyển tiếp thuần

Logic "gửi đến đâu" phải là hàm thuần, không chạm DB, để test rẻ và để trang chủ dùng được ngay cả khi DB hỏng. Ba đường dây nóng đang hardcode trong `app/page.tsx:151-167` chuyển về đây làm dữ liệu dự phòng đã xác minh.

**Files:**
- Create: `lib/authority-referral.ts`
- Test: `tests/authority-referral.test.mjs`

**Interfaces:**
- Consumes: `ContentTopic`, `isContentTopic` từ `@/lib/topics`; `brandLocality` từ `@/lib/brand`.
- Produces:
  ```ts
  export const authorityLevels = ["truong", "xa_phuong", "huyen", "tinh", "trung_uong"] as const;
  export type AuthorityLevel = (typeof authorityLevels)[number];
  export type ReferralAuthority = Readonly<{
    id: number; name: string; level: AuthorityLevel;
    topics: readonly ContentTopic[];
    scope: string; address: string; phone: string; hotline: string; note: string;
  }>;
  export type ReferralStep = Readonly<{ order: number; level: AuthorityLevel; levelLabel: string; authority: ReferralAuthority; badge: string }>;
  export function isAuthorityLevel(value: unknown): value is AuthorityLevel;
  export function authorityLevelLabel(level: AuthorityLevel): string;
  export function parseAuthorityTopics(value: unknown): readonly ContentTopic[];
  export function buildReferralChain(authorities: readonly ReferralAuthority[], topic: ContentTopic | null): readonly ReferralStep[];
  export function authorityBadge(authority: ReferralAuthority): string;
  export const fallbackReferralAuthorities: readonly ReferralAuthority[];
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/authority-referral.test.mjs`:

```js
import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("tsx/esm/api", import.meta.url);

const {
  authorityBadge,
  authorityLevelLabel,
  authorityLevels,
  buildReferralChain,
  fallbackReferralAuthorities,
  isAuthorityLevel,
  parseAuthorityTopics,
} = await import("../lib/authority-referral.ts");

const make = (overrides) => ({
  id: 1,
  name: "Cơ quan",
  level: "tinh",
  topics: [],
  scope: "",
  address: "",
  phone: "",
  hotline: "",
  note: "",
  ...overrides,
});

test("nhan cap duoc viet bang tieng Viet co dau", () => {
  assert.equal(authorityLevelLabel("truong"), "Nhà trường");
  assert.equal(authorityLevelLabel("xa_phuong"), "Xã / phường");
  assert.equal(authorityLevelLabel("huyen"), "Cấp huyện");
  assert.equal(authorityLevelLabel("tinh"), "Cấp tỉnh");
  assert.equal(authorityLevelLabel("trung_uong"), "Trung ương");
  assert.equal(authorityLevels.length, 5);
  assert.ok(isAuthorityLevel("tinh"));
  assert.ok(!isAuthorityLevel("quan_huyen"));
  assert.ok(!isAuthorityLevel(null));
});

test("parseAuthorityTopics chi giu linh vuc hop le", () => {
  assert.deepEqual(parseAuthorityTopics('["Giao thông","Không có thật"]'), [
    "Giao thông",
  ]);
  assert.deepEqual(parseAuthorityTopics(["Mạng xã hội", 7]), ["Mạng xã hội"]);
  assert.deepEqual(parseAuthorityTopics("khong-phai-json"), []);
  assert.deepEqual(parseAuthorityTopics(null), []);
  assert.deepEqual(parseAuthorityTopics('{"a":1}'), []);
  // Không nhân bản khi dữ liệu lặp.
  assert.deepEqual(parseAuthorityTopics('["Giao thông","Giao thông"]'), [
    "Giao thông",
  ]);
});

test("chuoi chuyen tiep di tu gan den xa, moi cap mot dau moi", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Tỉnh chung", level: "tinh" }),
      make({ id: 2, name: "Trường", level: "truong" }),
      make({ id: 3, name: "Công an xã", level: "xa_phuong" }),
    ],
    null,
  );
  assert.deepEqual(
    chain.map((step) => step.authority.name),
    ["Trường", "Công an xã", "Tỉnh chung"],
  );
  assert.deepEqual(
    chain.map((step) => step.order),
    [1, 2, 3],
  );
  assert.equal(chain[0].levelLabel, "Nhà trường");
});

test("dau moi dung linh vuc duoc uu tien hon dau moi chung", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Đầu mối chung tỉnh", level: "tinh" }),
      make({
        id: 2,
        name: "Phòng CSGT tỉnh",
        level: "tinh",
        topics: ["Giao thông"],
      }),
    ],
    "Giao thông",
  );
  assert.equal(chain.length, 1);
  assert.equal(chain[0].authority.name, "Phòng CSGT tỉnh");
});

test("dau moi cua linh vuc khac bi loai bo", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Chỉ mạng xã hội", level: "tinh", topics: ["Mạng xã hội"] }),
    ],
    "Giao thông",
  );
  assert.deepEqual(chain, []);
});

test("huy hieu uu tien duong day nong, roi den dien thoai, roi den cap", () => {
  assert.equal(authorityBadge(make({ hotline: "111", phone: "0262..." })), "111");
  assert.equal(authorityBadge(make({ phone: "02623 000 000" })), "02623 000 000");
  assert.equal(authorityBadge(make({ level: "xa_phuong" })), "Xã / phường");
});

test("du phong giu dung ba dau moi da xac minh cua trang chu", () => {
  assert.equal(fallbackReferralAuthorities.length, 3);
  const chain = buildReferralChain(fallbackReferralAuthorities, null);
  assert.equal(chain.length, 3);
  // Thứ tự theo cấp: xã/phường → tỉnh → trung ương, tức gần trước, xa sau.
  assert.deepEqual(
    chain.map((step) => step.badge),
    ["113", "TGPL", "111"],
  );
  assert.ok(chain[1].authority.name.includes("Trợ giúp pháp lý"));
  // DEC-022: không có số máy nào do AI sinh — mọi mục đều có ghi chú nguồn.
  for (const authority of fallbackReferralAuthorities) {
    assert.ok(authority.note.length > 0);
  }
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --experimental-strip-types --test tests/authority-referral.test.mjs`
Expected: FAIL — `Cannot find module '../lib/authority-referral.ts'`.

- [ ] **Step 3: Write `lib/authority-referral.ts`**

```ts
// Chuỗi "gửi đến đâu" cho mục trợ giúp pháp lý (US-039, DEC-022).
//
// Đây là hàm thuần, không chạm DB: trang chủ và trang trợ giúp đều dùng được
// kể cả khi cơ sở dữ liệu hỏng. AI không bao giờ sinh tên hay số điện thoại
// cơ quan — dữ liệu chỉ đến từ bảng `referral_authorities` đã duyệt, hoặc từ
// `fallbackReferralAuthorities` bên dưới (ba đầu mối công khai đã xác minh).

import { brandLocality } from "./brand";
import { isContentTopic, type ContentTopic } from "./topics";

export const authorityLevels = [
  "truong",
  "xa_phuong",
  "huyen",
  "tinh",
  "trung_uong",
] as const;

export type AuthorityLevel = (typeof authorityLevels)[number];

export type ReferralAuthority = Readonly<{
  id: number;
  name: string;
  level: AuthorityLevel;
  topics: readonly ContentTopic[];
  scope: string;
  address: string;
  phone: string;
  hotline: string;
  note: string;
}>;

export type ReferralStep = Readonly<{
  order: number;
  level: AuthorityLevel;
  levelLabel: string;
  authority: ReferralAuthority;
  badge: string;
}>;

const levelLabels: Readonly<Record<AuthorityLevel, string>> = Object.freeze({
  truong: "Nhà trường",
  xa_phuong: "Xã / phường",
  huyen: "Cấp huyện",
  tinh: "Cấp tỉnh",
  trung_uong: "Trung ương",
});

// Nhãn ngắn dùng cho huy hiệu khi cơ quan không có số máy công khai.
const levelSet: ReadonlySet<string> = new Set(authorityLevels);

export function isAuthorityLevel(value: unknown): value is AuthorityLevel {
  return typeof value === "string" && levelSet.has(value);
}

export function authorityLevelLabel(level: AuthorityLevel): string {
  return levelLabels[level];
}

export function parseAuthorityTopics(
  value: unknown,
): readonly ContentTopic[] {
  const raw = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ContentTopic>();
  for (const item of raw) {
    if (isContentTopic(item)) seen.add(item);
  }
  return Object.freeze([...seen]);
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function authorityBadge(authority: ReferralAuthority): string {
  return (
    authority.hotline.trim() ||
    authority.phone.trim() ||
    authorityLevelLabel(authority.level)
  );
}

// Thứ tự leo thang: gần người học trước, trung ương sau cùng.
export function buildReferralChain(
  authorities: readonly ReferralAuthority[],
  topic: ContentTopic | null,
): readonly ReferralStep[] {
  const steps: ReferralStep[] = [];
  for (const level of authorityLevels) {
    const atLevel = authorities.filter((item) => item.level === level);
    const chosen =
      (topic
        ? atLevel.find((item) => item.topics.includes(topic))
        : undefined) ??
      atLevel.find((item) => item.topics.length === 0);
    if (!chosen) continue;
    steps.push(
      Object.freeze({
        order: steps.length + 1,
        level,
        levelLabel: authorityLevelLabel(level),
        authority: chosen,
        badge: authorityBadge(chosen),
      }),
    );
  }
  return Object.freeze(steps);
}

// Ba đầu mối công khai đã xác minh, trước đây nằm trong app/page.tsx.
// Dùng khi DB chưa có dữ liệu hoặc lỗi — không bao giờ để trang trống số máy.
export const fallbackReferralAuthorities: readonly ReferralAuthority[] =
  Object.freeze([
    Object.freeze({
      id: -1,
      name: "Công an – tình huống khẩn cấp",
      level: "xa_phuong" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: "Toàn quốc",
      address: "",
      phone: "",
      hotline: "113",
      note: "Gọi ngay khi có nguy hiểm trực tiếp.",
    }),
    Object.freeze({
      id: -2,
      name: "Tổng đài quốc gia bảo vệ trẻ em",
      level: "trung_uong" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: "Toàn quốc",
      address: "",
      phone: "",
      hotline: "111",
      note: "24/7 · Miễn phí",
    }),
    Object.freeze({
      id: -3,
      name: `Trung tâm Trợ giúp pháp lý Nhà nước tỉnh ${brandLocality}`,
      level: "tinh" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: brandLocality,
      address: "",
      phone: "",
      hotline: "TGPL",
      note: "Sở Tư pháp · Tư vấn miễn phí cho HSSV",
    }),
  ]);
```

- [ ] **Step 4: Run the test**

Run: `node --experimental-strip-types --test tests/authority-referral.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/authority-referral.ts tests/authority-referral.test.mjs
git commit -m "$(cat <<'MSG'
feat: chuoi chuyen tiep co quan co tham quyen (US-039)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 6: `GET /api/co-quan`

Route đọc bảng đã duyệt, không bao giờ trả trang trống: DB hỏng thì rơi về chuỗi dự phòng và đánh dấu `degraded: true` (DEC-008).

**Files:**
- Create: `lib/authority-store.ts`
- Create: `app/api/co-quan/route.ts`
- Test: `tests/authority-store.test.mjs`

**Interfaces:**
- Consumes: `ReferralAuthority`, `ReferralStep`, `buildReferralChain`, `fallbackReferralAuthorities`, `isAuthorityLevel`, `parseAuthorityTopics` từ `@/lib/authority-referral`; `isContentTopic` từ `@/lib/topics`; `referralAuthorities` từ `@/db/pg-schema`; `getInitializedDb` từ `@/db`.
- Produces:
  ```ts
  export type AuthorityRow = Readonly<{ id: unknown; name: unknown; level: unknown; topics: unknown; scope: unknown; address: unknown; phone: unknown; hotline: unknown; note: unknown }>;
  export type ReferralPayload = Readonly<{ topic: ContentTopic | null; chain: readonly ReferralStep[]; degraded: boolean }>;
  export function parseAuthorityRows(rows: readonly AuthorityRow[]): readonly ReferralAuthority[];
  export function buildReferralPayload(rows: readonly AuthorityRow[] | null, topic: ContentTopic | null): ReferralPayload;
  export function createAuthorityHandler(loadRows: () => Promise<readonly AuthorityRow[]>): (request: Request) => Promise<Response>;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/authority-store.test.mjs`:

```js
import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("tsx/esm/api", import.meta.url);

const { buildReferralPayload, createAuthorityHandler, parseAuthorityRows } =
  await import("../lib/authority-store.ts");

const row = (overrides) => ({
  id: 1,
  name: "Công an phường Thắng Lợi",
  level: "xa_phuong",
  topics: '["An ninh trật tự"]',
  scope: "Phường Thắng Lợi",
  address: "01 Lê Duẩn",
  phone: "02623 000 000",
  hotline: "",
  note: "",
  ...overrides,
});

test("hang du lieu hong bi loai thay vi lam sap route", () => {
  const parsed = parseAuthorityRows([
    row(),
    row({ id: 2, level: "quan_huyen" }),
    row({ id: 3, name: "   " }),
    row({ id: "khong-phai-so" }),
    row({ id: 5, topics: null, phone: null, note: undefined }),
  ]);
  assert.deepEqual(
    parsed.map((item) => item.id),
    [1, 5],
  );
  assert.deepEqual(parsed[0].topics, ["An ninh trật tự"]);
  // Cột rỗng phải thành chuỗi rỗng, không phải null lọt xuống UI.
  assert.equal(parsed[1].phone, "");
  assert.equal(parsed[1].note, "");
});

test("khong co du lieu thi dung chuoi du phong va bao degraded", () => {
  const payload = buildReferralPayload(null, "Giao thông");
  assert.equal(payload.degraded, true);
  assert.equal(payload.topic, "Giao thông");
  assert.ok(payload.chain.length >= 1);

  const empty = buildReferralPayload([], null);
  assert.equal(empty.degraded, true);
  assert.ok(empty.chain.length >= 1);
});

test("co du lieu that thi khong degraded", () => {
  const payload = buildReferralPayload([row()], "An ninh trật tự");
  assert.equal(payload.degraded, false);
  assert.equal(payload.chain[0].authority.name, "Công an phường Thắng Lợi");
  assert.equal(payload.chain[0].badge, "02623 000 000");
});

test("linh vuc khong hop le bi tu choi bang 400", async () => {
  const handler = createAuthorityHandler(async () => [row()]);
  const response = await handler(
    new Request("https://x.test/api/co-quan?topic=Khong+co+that"),
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_TOPIC");
});

test("route tra ve chuoi va khong cho cache", async () => {
  const handler = createAuthorityHandler(async () => [row()]);
  const response = await handler(
    new Request("https://x.test/api/co-quan?topic=An%20ninh%20tr%E1%BA%ADt%20t%E1%BB%B1"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.topic, "An ninh trật tự");
  assert.equal(body.degraded, false);
  assert.equal(body.chain.length, 1);
});

test("DB hong van tra 200 kem chuoi du phong", async () => {
  const handler = createAuthorityHandler(async () => {
    throw new Error("connection refused");
  });
  const response = await handler(new Request("https://x.test/api/co-quan"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.degraded, true);
  assert.ok(body.chain.length >= 1);
  assert.equal(body.topic, null);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --experimental-strip-types --test tests/authority-store.test.mjs`
Expected: FAIL — `Cannot find module '../lib/authority-store.ts'`.

- [ ] **Step 3: Write `lib/authority-store.ts`**

```ts
// Đọc và chuẩn hóa dữ liệu cơ quan cho /api/co-quan (US-039).
// Tách khỏi route để test được mà không cần dựng runtime Cloudflare.

import {
  buildReferralChain,
  fallbackReferralAuthorities,
  isAuthorityLevel,
  parseAuthorityTopics,
  type ReferralAuthority,
  type ReferralStep,
} from "./authority-referral";
import { isContentTopic, type ContentTopic } from "./topics";

export type AuthorityRow = Readonly<{
  id: unknown;
  name: unknown;
  level: unknown;
  topics: unknown;
  scope: unknown;
  address: unknown;
  phone: unknown;
  hotline: unknown;
  note: unknown;
}>;

export type ReferralPayload = Readonly<{
  topic: ContentTopic | null;
  chain: readonly ReferralStep[];
  degraded: boolean;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Một hàng hỏng chỉ làm mất chính nó, không được làm sập cả mục trợ giúp.
export function parseAuthorityRows(
  rows: readonly AuthorityRow[],
): readonly ReferralAuthority[] {
  const parsed: ReferralAuthority[] = [];
  for (const row of rows) {
    const id = typeof row.id === "number" ? row.id : Number.NaN;
    const name = text(row.name);
    if (!Number.isInteger(id) || name === "") continue;
    if (!isAuthorityLevel(row.level)) continue;
    parsed.push(
      Object.freeze({
        id,
        name,
        level: row.level,
        topics: parseAuthorityTopics(row.topics),
        scope: text(row.scope),
        address: text(row.address),
        phone: text(row.phone),
        hotline: text(row.hotline),
        note: text(row.note),
      }),
    );
  }
  return Object.freeze(parsed);
}

export function buildReferralPayload(
  rows: readonly AuthorityRow[] | null,
  topic: ContentTopic | null,
): ReferralPayload {
  const parsed = rows ? parseAuthorityRows(rows) : [];
  const chain = buildReferralChain(parsed, topic);
  if (chain.length > 0) {
    return Object.freeze({ topic, chain, degraded: false });
  }
  return Object.freeze({
    topic,
    chain: buildReferralChain(fallbackReferralAuthorities, topic),
    degraded: true,
  });
}

export function createAuthorityHandler(
  loadRows: () => Promise<readonly AuthorityRow[]>,
): (request: Request) => Promise<Response> {
  return async function handle(request: Request): Promise<Response> {
    const requested = new URL(request.url).searchParams.get("topic");
    if (requested !== null && !isContentTopic(requested)) {
      return Response.json(
        { error: "INVALID_TOPIC" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const topic: ContentTopic | null = requested === null ? null : requested;

    let rows: readonly AuthorityRow[] | null = null;
    try {
      rows = await loadRows();
    } catch {
      rows = null;
    }
    return Response.json(buildReferralPayload(rows, topic), {
      headers: { "Cache-Control": "no-store" },
    });
  };
}
```

- [ ] **Step 4: Run the test**

Run: `node --experimental-strip-types --test tests/authority-store.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the route**

Create `app/api/co-quan/route.ts`, mirroring the shape of `app/api/content/route.ts`:

```ts
// Đầu mối tiếp nhận theo thẩm quyền cho mục trợ giúp pháp lý (US-039).
// Chỉ trả bản `published` — bản nháp không được lộ ra ngoài (DEC-003).

import { eq } from "drizzle-orm";

import { getInitializedDb } from "@/db";
import { referralAuthorities } from "@/db/pg-schema";
import { createAuthorityHandler } from "@/lib/authority-store";

export const GET = createAuthorityHandler(async () => {
  const db = await getInitializedDb();
  return await db
    .select({
      id: referralAuthorities.id,
      name: referralAuthorities.name,
      level: referralAuthorities.level,
      topics: referralAuthorities.topics,
      scope: referralAuthorities.scope,
      address: referralAuthorities.address,
      phone: referralAuthorities.phone,
      hotline: referralAuthorities.hotline,
      note: referralAuthorities.note,
    })
    .from(referralAuthorities)
    .where(eq(referralAuthorities.status, "published"));
});
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Nếu `db.select(...)` báo lỗi kiểu, đối chiếu cách gọi trong `app/api/content/route.ts` — cùng một `getInitializedDb()`.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/authority-store.ts app/api/co-quan/route.ts tests/authority-store.test.mjs
git commit -m "$(cat <<'MSG'
feat: api co quan tiep nhan theo linh vuc (US-039, DEC-008)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 7: `POST /api/chat` trả kèm `topic`

Trang trợ giúp pháp lý cần biết câu hỏi thuộc lĩnh vực nào để chọn đúng chuỗi cơ quan. Bộ định tuyến `routeQuestionToTopic` đã có sẵn và đã được dùng ở `lib/legal-chat.ts`; ở đây chỉ thêm một trường vào payload. Thay đổi thuần cộng thêm: client cũ bỏ qua trường lạ, `parseChatAnswerPayload` (Task 3) đã đọc `topic` rồi.

**Files:**
- Modify: `app/api/chat/route.ts:86-91` (`unavailableResponse`), `:210-215` (sau khi lấy `question`), và các điểm dựng câu trả lời
- Test: `tests/chat-topic.test.mjs` (create)

**Interfaces:**
- Consumes: `routeQuestionToTopic` từ `@/lib/knowledge-router`; `ContentTopic` từ `@/lib/topics`; `createChatHandler` (đã có, nhận `Partial<ChatHandlerDependencies>`); `parseChatAnswerPayload` (Task 3) đọc trường này.
- Produces: mọi phản hồi 200 của `/api/chat` có thêm `topic: ContentTopic | null`.

- [ ] **Step 1: Chạy impact trước khi sửa**

Run `impact({target: "unavailableResponse", direction: "upstream"})` và `impact({target: "createChatHandler", direction: "upstream"})`. Báo bán kính ảnh hưởng cho người dùng; dừng lại nếu HIGH/CRITICAL.

- [ ] **Step 2: Write the failing test**

Create `tests/chat-topic.test.mjs`:

```js
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__workerEnvStub ??= {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
      };
    }
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const NextResponse = { json: (body, init) => Response.json(body, init) };",
      };
    }
    if (specifier.startsWith("@/")) {
      const suffix = specifier.endsWith(".json") ? "" : ".ts";
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}${suffix}`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { createChatHandler } = await import("../app/api/chat/route.ts");

const allowAll = () => ({
  consumeChat: async () => ({ allowed: true, status: 200, retryAfter: 0 }),
});
const silentTelemetry = { emit() {} };

function ask(question) {
  return new Request("https://x.test/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

test("cau tra loi tu kho co kem linh vuc", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: () => silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => "Bạn phải đội mũ bảo hiểm khi đi xe máy điện.",
    curatedAnswer: () => null,
  });
  const response = await handler(
    ask("Không đội mũ bảo hiểm khi đi xe máy điện bị phạt bao nhiêu?"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.topic, "Giao thông");
});

test("cau hoi khong thuoc linh vuc nao thi topic la null", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: () => silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => "Trả lời chung.",
    curatedAnswer: () => null,
  });
  const response = await handler(ask("abc xyz qwerty"));
  const body = await response.json();
  assert.equal(body.topic, null);
});

test("cau tra loi khong kha dung van kem linh vuc de goi y co quan", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: () => silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    webSearch: async () => ({ ok: false, code: "DISABLED" }),
    referenceWebSearch: async () => ({ ok: false, code: "DISABLED" }),
    reviewedWebAnswer: async () => ({ ok: false, code: "DISABLED" }),
  });
  const response = await handler(
    ask("Bị bạn cùng lớp đánh trong trường thì báo ai?"),
  );
  const body = await response.json();
  assert.equal(body.mode, "unavailable");
  assert.equal(body.topic, "Bạo lực học đường");
});

test("cau hoi rong van tra 400 va khong co topic", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: () => silentTelemetry,
  });
  const response = await handler(ask("   "));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.topic, undefined);
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `node --test tests/chat-topic.test.mjs`
Expected: FAIL — `body.topic` là `undefined` thay vì `"Giao thông"`.

- [ ] **Step 4: Cho `unavailableResponse` nhận lĩnh vực**

Sửa `app/api/chat/route.ts:86-91`:

```ts
function unavailableResponse(topic: ContentTopic | null = null) {
  return NextResponse.json({
    answer: unavailableAnswer,
    mode: "unavailable",
    topic,
  });
}
```

Thêm import ở đầu tệp, cạnh các import `@/lib` khác:

```ts
import { routeQuestionToTopic } from "@/lib/knowledge-router";
import type { ContentTopic } from "@/lib/topics";
```

- [ ] **Step 5: Tính lĩnh vực một lần cho cả request**

Khai báo `answerTopic` **trước** khối `try` bắt đầu ở dòng ~210 để khối `catch` cuối cùng (dòng ~606) cũng nhìn thấy:

```ts
    // Lĩnh vực của câu hỏi — dùng để trang trợ giúp chọn đúng chuỗi cơ quan
    // (US-039). Tính một lần, dùng cho mọi nhánh kể cả nhánh lỗi.
    let answerTopic: ContentTopic | null = null;

    try {
      const body = (await request.json()) as { messages?: unknown };
```

Ngay sau khối kiểm tra `if (!question) { ... }`, thêm:

```ts
      answerTopic = routeQuestionToTopic(question)?.topic ?? null;

      // Mọi phản hồi 200 đều kèm lĩnh vực; phản hồi lỗi 4xx thì không.
      const answerJson = (payload: Record<string, unknown>) =>
        NextResponse.json({ ...payload, topic: answerTopic });
```

- [ ] **Step 6: Đổi các điểm dựng câu trả lời sang `answerJson`**

Trong khối `try`, đổi `NextResponse.json(` thành `answerJson(` tại đúng các vị trí dựng câu trả lời (số dòng trước khi sửa): 230, 259, 308, 340, 440, 514. Giữ nguyên `NextResponse.json(` ở dòng 219 (lỗi 400 "Bạn hãy nhập một câu hỏi trước nhé.") và ở `unavailableResponse` — hai chỗ đó không kèm lĩnh vực, riêng `unavailableResponse` đã nhận tham số.

Ở dòng 308 và 514 tham số là biến/đối tượng có sẵn nên chỉ đổi tên hàm:

```ts
          answerJson(knowledgePayload),
```

- [ ] **Step 7: Truyền lĩnh vực vào mọi lời gọi `unavailableResponse`**

Cả 11 lời gọi (dòng 244, 361, 370, 388, 401, 426, 480, 499, 552, 587, 607) đổi thành `unavailableResponse(answerTopic)`. Vì `answerTopic` được khai báo trước khối `try` (Step 5) nên nó có giá trị ở mọi lời gọi, kể cả lời gọi trong khối `catch` ở dòng 607. Cách an toàn để không bỏ sót:

```bash
perl -0pi -e 's/unavailableResponse\(\),/unavailableResponse(answerTopic),/g' app/api/chat/route.ts
perl -0pi -e 's/complete\(unavailableResponse\(\), "unavailable"/complete(unavailableResponse(answerTopic), "unavailable"/g' app/api/chat/route.ts
```

Dòng định nghĩa kết thúc bằng `unavailableResponse(topic: ContentTopic | null = null) {` nên không bị hai lệnh trên chạm vào. Kiểm tra lại:

```bash
grep -n "unavailableResponse(" app/api/chat/route.ts
```
Kỳ vọng: một dòng định nghĩa + 11 dòng `unavailableResponse(answerTopic)`.

- [ ] **Step 8: Run the tests**

Run: `node --test tests/chat-topic.test.mjs`
Expected: PASS (4 tests).

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, suite PASS. Các test chat hiện có dùng `assert.deepEqual` trên toàn payload sẽ đỏ vì có thêm `topic` — sửa kỳ vọng bằng cách thêm `topic: <giá trị đúng>`, không được xóa assert.

- [ ] **Step 9: Commit**

Run `detect_changes()` first, then:

```bash
git add app/api/chat/route.ts tests/chat-topic.test.mjs
git commit -m "$(cat <<'MSG'
feat: api chat tra kem linh vuc cau hoi (US-039)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

### Task 8: Trang `/tro-giup-phap-ly` và băng trợ giúp lấy dữ liệu từ API

Đây là tác vụ khép lại US-039: một trang riêng để hỏi và nhận đúng chuỗi "gửi đến đâu", cộng với việc băng trợ giúp ở trang chủ thôi hardcode số máy. Băng trợ giúp được tách thành component riêng nên `app/page.tsx` ngắn đi (~30 dòng bỏ, 1 dòng thêm), thỏa ràng buộc toàn cục.

**Files:**
- Create: `components/ReferralChain.tsx`
- Create: `components/HelpHotlines.tsx`
- Create: `components/LegalAidConsult.tsx`
- Create: `app/tro-giup-phap-ly/page.tsx`
- Create: `app/styles/legal-aid.css`
- Modify: `app/globals.css` (thêm một dòng `@import`)
- Modify: `app/page.tsx` (bỏ `helpHotlines` ở 151-167, thay khối `hotline-list` ở 800-812 bằng `<HelpHotlines />`, thêm liên kết ở nav 413-418 và cột footer 864-871)
- Modify: `docs/USER_STORIES.md`, `docs/PROGRESS.md`, `docs/TECHNICAL_SPEC.md`
- Test: `tests/legal-aid.test.mjs` (create)

Khác một điểm so với spec: băng trợ giúp ở trang chủ hiển thị **cả chuỗi** trả về từ `/api/co-quan` chứ không lọc riêng cấp `trung_uong`/`tinh`. Lọc theo hai cấp đó sẽ làm mất số 113 (cấp `xa_phuong`) đang hiển thị hôm nay; giữ cả chuỗi thì băng trợ giúp không mất đầu mối nào.

**Interfaces:**
- Consumes: `ReferralStep`, `ReferralAuthority`, `buildReferralChain`, `fallbackReferralAuthorities` từ `@/lib/authority-referral`; `ReferralPayload` từ `@/lib/authority-store`; `parseChatAnswerPayload`, `chatAnswerNetworkErrorText`, `ChatAnswerView` từ `@/lib/chat-answer-view` (Task 3); `ChatAnswerBody` từ `@/components/ChatAnswerBody` (Task 3); `AiDisclaimer` từ `@/components/AiDisclaimer` (Task 2); `isContentTopic`, `ContentTopic` từ `@/lib/topics`; `brandName`, `brandLocality` từ `@/lib/brand`.
- Produces:
  ```tsx
  export function ReferralChain(props: Readonly<{ steps: readonly ReferralStep[]; degraded: boolean }>): JSX.Element | null;
  export function HelpHotlines(): JSX.Element;
  export function LegalAidConsult(): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/legal-aid.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

register("tsx/esm/api", import.meta.url);

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { ReferralChain } = await import("../components/ReferralChain.tsx");
const { buildReferralChain, fallbackReferralAuthorities } = await import(
  "../lib/authority-referral.ts"
);

const repositoryRoot = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, repositoryRoot), "utf8");

test("chuoi co quan hien so thu tu, cap va huy hieu lien he", () => {
  const html = renderToStaticMarkup(
    React.createElement(ReferralChain, {
      steps: buildReferralChain(fallbackReferralAuthorities, null),
      degraded: false,
    }),
  );
  assert.match(html, /Gửi đến đâu/);
  assert.match(html, /Xã \/ phường/);
  assert.match(html, /Cấp tỉnh/);
  assert.match(html, /Trung ương/);
  assert.match(html, /113/);
  assert.match(html, /111/);
  // Số máy phải bấm gọi được trên điện thoại.
  assert.match(html, /href="tel:113"/);
  // Nhãn TGPL không phải số máy nên không được dựng thành liên kết tel:
  assert.doesNotMatch(html, /href="tel:TGPL"/);
});

test("khi du lieu chua duyet thi noi ro day la danh sach du phong", () => {
  const html = renderToStaticMarkup(
    React.createElement(ReferralChain, {
      steps: buildReferralChain(fallbackReferralAuthorities, null),
      degraded: true,
    }),
  );
  assert.match(html, /danh sách dự phòng/i);
});

test("khong co buoc nao thi khong ve khoi rong", () => {
  const html = renderToStaticMarkup(
    React.createElement(ReferralChain, { steps: [], degraded: false }),
  );
  assert.equal(html, "");
});

test("trang tro giup dung lai component chat chung, khong chep logic", async () => {
  const consult = await read("components/LegalAidConsult.tsx");
  assert.match(consult, /parseChatAnswerPayload/);
  assert.match(consult, /ChatAnswerBody/);
  assert.match(consult, /ReferralChain/);
  // DEC-020: khuyến cáo đến từ một nguồn duy nhất.
  assert.doesNotMatch(consult, /không bảo đảm chính xác/);
  assert.doesNotMatch(consult, /dangerouslySetInnerHTML/);
  // DEC-022: tên và số máy cơ quan chỉ đến từ ReferralChain, không viết cứng
  // trong trang này.
  assert.doesNotMatch(consult, /tel:/);
  assert.doesNotMatch(consult, /\b1(11|13)\b/);
});

test("bang tro giup o trang chu doc tu API chu khong hardcode", async () => {
  const [page, hotlines] = await Promise.all([
    read("app/page.tsx"),
    read("components/HelpHotlines.tsx"),
  ]);
  assert.doesNotMatch(page, /helpHotlines/);
  assert.match(page, /<HelpHotlines \/>/);
  assert.match(hotlines, /\/api\/co-quan/);
  assert.match(hotlines, /fallbackReferralAuthorities/);
  // Liên kết tới trang trợ giúp có ở cả điều hướng lẫn chân trang.
  assert.ok(page.split("/tro-giup-phap-ly").length - 1 >= 2);
});

test("trang tro giup co metadata rieng va nap css", async () => {
  const [shell, globals, css] = await Promise.all([
    read("app/tro-giup-phap-ly/page.tsx"),
    read("app/globals.css"),
    read("app/styles/legal-aid.css"),
  ]);
  assert.match(shell, /export const metadata/);
  assert.match(shell, /LegalAidConsult/);
  assert.match(globals, /@import "\.\/styles\/legal-aid\.css";/);
  assert.match(css, /\.referral-chain/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test("app\/page.tsx ngan di sau khi tach bang tro giup", async () => {
  const page = await read("app/page.tsx");
  assert.ok(
    page.split("\n").length < 1113,
    "app/page.tsx phải ngắn hơn 1113 dòng sau tác vụ này",
  );
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --experimental-strip-types --test tests/legal-aid.test.mjs`
Expected: FAIL — `Cannot find module '../components/ReferralChain.tsx'`.

- [ ] **Step 3: Write `components/ReferralChain.tsx`**

```tsx
// Khối "Gửi đến đâu" (US-039, DEC-022). Chỉ hiển thị dữ liệu đã duyệt được
// truyền vào; component này không gọi mô hình và không tự suy ra cơ quan nào.

import type { ReferralStep } from "@/lib/authority-referral";

type ReferralChainProps = Readonly<{
  steps: readonly ReferralStep[];
  degraded: boolean;
}>;

// Chỉ dựng liên kết gọi khi huy hiệu thực sự là số máy.
function telHref(badge: string): string | null {
  const digits = badge.replace(/[\s.-]/g, "");
  return /^\+?\d{3,15}$/.test(digits) ? `tel:${digits}` : null;
}

export function ReferralChain({ steps, degraded }: ReferralChainProps) {
  if (steps.length === 0) return null;
  return (
    <section className="referral-chain" aria-labelledby="referral-title">
      <h3 id="referral-title">Gửi đến đâu</h3>
      <p className="referral-lead">
        Đi từ nơi gần nhất; nếu chưa được giải quyết thì chuyển lên cấp sau.
      </p>
      <ol>
        {steps.map((step) => {
          const href = telHref(step.badge);
          return (
            <li key={step.authority.id}>
              <span className="referral-order" aria-hidden="true">
                {step.order}
              </span>
              <div className="referral-body">
                <p className="referral-level">{step.levelLabel}</p>
                <strong>{step.authority.name}</strong>
                {step.authority.scope ? (
                  <small>{step.authority.scope}</small>
                ) : null}
                {step.authority.address ? (
                  <small>{step.authority.address}</small>
                ) : null}
                {step.authority.note ? (
                  <small>{step.authority.note}</small>
                ) : null}
              </div>
              {href ? (
                <a className="referral-badge" href={href}>
                  {step.badge}
                </a>
              ) : (
                <span className="referral-badge">{step.badge}</span>
              )}
            </li>
          );
        })}
      </ol>
      {degraded ? (
        <p className="referral-degraded" role="note">
          Đây là danh sách dự phòng. Đầu mối tại địa phương bạn chưa được duyệt
          nên chưa hiển thị đầy đủ.
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Write `components/HelpHotlines.tsx`**

```tsx
"use client";

// Băng đường dây nóng ở trang chủ (US-039). Trước đây ba đầu mối bị hardcode
// trong app/page.tsx; giờ lấy từ /api/co-quan để bộ phận nghiệp vụ cập nhật
// được mà không phải sửa mã. Dữ liệu dự phòng hiển thị ngay từ lần vẽ đầu nên
// băng này không bao giờ trống.

import { useEffect, useState } from "react";

import {
  buildReferralChain,
  fallbackReferralAuthorities,
  type ReferralStep,
} from "@/lib/authority-referral";
import { PhoneIcon } from "@/components/icons";

const fallbackSteps = buildReferralChain(fallbackReferralAuthorities, null);

export function HelpHotlines() {
  const [steps, setSteps] = useState<readonly ReferralStep[]>(fallbackSteps);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/co-quan", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          chain?: readonly ReferralStep[];
        };
        if (Array.isArray(payload.chain) && payload.chain.length > 0) {
          setSteps(payload.chain);
        }
      } catch {
        // Giữ nguyên danh sách dự phòng — băng trợ giúp không được trống.
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <ul className="hotline-list">
      {steps.map((step) => (
        <li className="hotline-card" key={step.authority.id}>
          <i aria-hidden="true">{step.badge}</i>
          <div>
            <strong>{step.authority.name}</strong>
            <small>{step.authority.note || step.levelLabel}</small>
          </div>
          <PhoneIcon aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
```


- [ ] **Step 5: Write `components/LegalAidConsult.tsx`**

```tsx
"use client";

// Mục trợ giúp pháp lý (US-039). Ô hỏi dùng lại đúng bộ phân tích và khối
// hiển thị của chat trang chủ (Task 3) nên khuyến cáo, nhãn nguồn và thứ tự
// DOM không thể lệch nhau. Phần riêng của trang này chỉ là chuỗi cơ quan.

import { useState } from "react";

import { AiDisclaimer } from "@/components/AiDisclaimer";
import { ChatAnswerBody } from "@/components/ChatAnswerBody";
import { ReferralChain } from "@/components/ReferralChain";
import type { ReferralStep } from "@/lib/authority-referral";
import {
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
  type ChatAnswerView,
} from "@/lib/chat-answer-view";

type ConsultState = Readonly<{
  answer: ChatAnswerView | null;
  chain: readonly ReferralStep[];
  degraded: boolean;
  error: string;
}>;

const emptyState: ConsultState = {
  answer: null,
  chain: [],
  degraded: false,
  error: "",
};

export function LegalAidConsult() {
  const [question, setQuestion] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [state, setState] = useState<ConsultState>(emptyState);

  async function loadChain(topic: string | null) {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    const response = await fetch(`/api/co-quan${query}`);
    if (!response.ok) return { chain: [], degraded: true } as const;
    const payload = (await response.json()) as {
      chain?: readonly ReferralStep[];
      degraded?: boolean;
    };
    return {
      chain: Array.isArray(payload.chain) ? payload.chain : [],
      degraded: payload.degraded === true,
    } as const;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const asked = question.trim();
    if (asked === "" || isLoading) return;
    setLoading(true);
    setState(emptyState);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: asked }] }),
      });
      const answer = parseChatAnswerPayload(await response.json());
      const referral = await loadChain(answer.topic);
      setState({
        answer,
        chain: referral.chain,
        degraded: referral.degraded,
        error: "",
      });
    } catch {
      const referral = await loadChain(null).catch(() => ({
        chain: [] as readonly ReferralStep[],
        degraded: true,
      }));
      setState({
        answer: null,
        chain: referral.chain,
        degraded: referral.degraded,
        error: chatAnswerNetworkErrorText,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="legal-aid">
      <form className="legal-aid-form" onSubmit={submit}>
        <label htmlFor="legal-aid-question">
          Bạn đang gặp chuyện gì? Kể ngắn gọn cũng được.
        </label>
        <textarea
          id="legal-aid-question"
          value={question}
          rows={3}
          maxLength={600}
          placeholder="Ví dụ: Em bị bạn cùng lớp đe dọa qua tin nhắn thì báo cho ai?"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="btn-gold" disabled={isLoading}>
          {isLoading ? "Đang tìm…" : "Tìm nơi tiếp nhận"}
        </button>
      </form>

      <AiDisclaimer variant="compact" />

      {state.error ? (
        <p className="legal-aid-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.answer ? <ChatAnswerBody answer={state.answer} /> : null}

      <ReferralChain steps={state.chain} degraded={state.degraded} />
    </div>
  );
}
```

- [ ] **Step 6: Write `app/tro-giup-phap-ly/page.tsx`**

```tsx
// Vỏ server cho mục trợ giúp pháp lý (US-039). Phần tĩnh render ở server để
// trình thu thập và người dùng thấy ngay đầu mối; phần hỏi đáp là client.

import type { Metadata } from "next";
import Link from "next/link";

import { LegalAidConsult } from "@/components/LegalAidConsult";
import { brandLocality, brandName } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Trợ giúp pháp lý | ${brandName}`,
  description: `Mô tả tình huống để biết nên gửi đơn, trình báo hoặc nhờ hỗ trợ ở đâu tại ${brandLocality}.`,
};

export default function LegalAidPage() {
  return (
    <main className="shell legal-aid-page">
      <p className="legal-aid-kicker">Trợ giúp pháp lý</p>
      <h1>Không biết gửi đơn ở đâu? Bắt đầu từ đây.</h1>
      <p className="legal-aid-lead">
        Mô tả tình huống của bạn, cổng sẽ chỉ ra cơ quan có thẩm quyền tiếp
        nhận theo thứ tự từ gần đến xa. Thông tin cơ quan do bộ phận nghiệp vụ
        nhập và duyệt, không do trợ lý tự sinh ra.
      </p>

      <LegalAidConsult />

      <p className="legal-aid-back">
        <Link href="/">← Về trang chủ</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Write `app/styles/legal-aid.css` và nạp vào `app/globals.css`**

```css
/* Trang trợ giúp pháp lý (US-039). Dùng lại token chung; không đặt lại màu. */

.legal-aid-page {
  display: grid;
  gap: 16px;
  padding-block: clamp(32px, 4vw, 64px);
  max-width: 760px;
}
.legal-aid-kicker {
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.154em;
  text-transform: uppercase;
  color: var(--brick-deep);
}
.legal-aid-lead { color: var(--ink-soft); line-height: 1.625; }
.legal-aid-back a { color: var(--brick-deep); font-weight: 700; }

.legal-aid { display: grid; gap: 16px; }
.legal-aid-form { display: grid; gap: 10px; justify-items: start; }
.legal-aid-form textarea {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-strong);
  background: var(--cream-warm);
  color: inherit;
  font: inherit;
  resize: vertical;
}
.legal-aid-form textarea:focus-visible {
  outline: 2px solid var(--gold-deep);
  outline-offset: 2px;
}
.legal-aid-error { color: var(--brick-deep); font-weight: 700; }

/* ---- Chuỗi cơ quan ---- */
.referral-chain {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-strong);
  background: var(--sand);
}
.referral-chain h3 { font-size: 1.125rem; }
.referral-lead { color: var(--ink-soft); font-size: 0.9375rem; }
.referral-chain ol { display: grid; gap: 10px; list-style: none; padding: 0; }
.referral-chain li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--r-xs);
  background: var(--cream-warm);
  border: 1px solid var(--line-strong);
}
.referral-order {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gold-soft);
  color: var(--brick-deep);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.referral-body { display: grid; gap: 2px; min-width: 0; }
.referral-level {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.referral-body small { color: var(--ink-soft); font-size: 0.8125rem; }
.referral-badge {
  padding: 6px 10px;
  border-radius: var(--r-xs);
  background: var(--gold-soft);
  color: var(--brick-deep);
  font-weight: 800;
  white-space: nowrap;
  text-decoration: none;
}
a.referral-badge:hover { background: var(--gold-deep); color: #fff8ec; }
.referral-degraded {
  font-size: 0.875rem;
  color: var(--ink-soft);
  border-left: 4px solid var(--gold-deep);
  padding-left: 10px;
}

@media (max-width: 720px) {
  .referral-chain li { grid-template-columns: auto minmax(0, 1fr); }
  .referral-badge { grid-column: 2; justify-self: start; }
}
```

Thêm vào `app/globals.css`, sau dòng `@import "./styles/disclaimer.css";` (đã thêm ở Task 2):

```css
@import "./styles/legal-aid.css";
```

- [ ] **Step 8: Sửa `app/page.tsx`**

Chạy `impact({target: "Home", direction: "upstream"})` trước khi sửa (hoặc tên component mặc định của tệp).

8a. Xóa hằng `helpHotlines` ở dòng 151-167.

8b. Thay khối `<ul className="hotline-list">…</ul>` (dòng ~800-812) bằng một dòng:

```tsx
              <HelpHotlines />
```

8c. Thêm import cạnh các import component khác:

```tsx
import { HelpHotlines } from "@/components/HelpHotlines";
```

8d. Giữ nguyên `PhoneIcon` trong khối import của `app/page.tsx` — nó vẫn được dùng ở dòng 145 (`green: PhoneIcon`) và dòng 840 (khối liên hệ ở chân trang).

8e. Thêm liên kết điều hướng, sau `<a href="#ren-luyen">Thử thách</a>` ở dòng ~417:

```tsx
            <a href="/tro-giup-phap-ly">Trợ giúp pháp lý</a>
```

8f. Thêm vào cột "Khám phá" ở chân trang (dòng ~866-871), trước mục "Nguồn luật gốc":

```tsx
                <li><a href="/tro-giup-phap-ly">Trợ giúp pháp lý</a></li>
```

- [ ] **Step 9: Run the tests**

Run: `node --experimental-strip-types --test tests/legal-aid.test.mjs`
Expected: PASS (7 tests).

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: không lỗi kiểu, suite PASS, build xong. Nếu build báo `useState`/`useEffect` trong server component, kiểm tra lại `"use client"` nằm ở **dòng đầu tiên** của `HelpHotlines.tsx` và `LegalAidConsult.tsx` (trước cả khối chú thích).

- [ ] **Step 10: Kiểm tra bằng mắt ở môi trường cục bộ**

Run: `npm run dev`, mở `http://localhost:3000/tro-giup-phap-ly`, rồi:
1. Gửi câu "Em bị bạn cùng lớp đe dọa qua tin nhắn thì báo cho ai?" — kỳ vọng có câu trả lời, có khối khuyến cáo, và chuỗi cơ quan hiện (dự phòng, kèm dòng "danh sách dự phòng" vì bảng còn rỗng).
2. Thu cửa sổ xuống 380px — kiểm tra không có thanh cuộn ngang, huy hiệu xuống dòng.
3. Kiểm tra bàn phím: Tab tới ô nhập → nút gửi → các liên kết `tel:`; viền focus phải thấy rõ.
4. Về trang chủ, xác nhận băng trợ giúp vẫn đủ ba đầu mối.

Ghi kết quả (kèm ngày) vào `docs/PROGRESS.md` — không có bằng chứng thì không được tick `[x]`.

- [ ] **Step 11: Cập nhật tài liệu**

`docs/USER_STORIES.md`: đánh dấu US-038 và US-039 đã xong, kèm đường dẫn tới plan này.

`docs/TECHNICAL_SPEC.md`: thêm các quyết định của giai đoạn 1 theo đúng khuôn hiện có —
- **DEC-020** — khuyến cáo độ chính xác chỉ có một nguồn: `lib/ai-disclosure.ts`. Mọi bề mặt hiển thị qua `components/AiDisclaimer`; cấm viết lại câu cảnh báo tại chỗ.
- **DEC-021** — nhãn hiệu lực tối thiểu hiển thị cùng trích dẫn.
- **DEC-022** — tên, địa chỉ, số máy cơ quan là dữ liệu đã duyệt trong `referral_authorities`; AI không được sinh. Thiếu dữ liệu thì rơi về đầu mối cấp tỉnh, không suy đoán.

`docs/PROGRESS.md`: một mục cho GĐ1 với bằng chứng — lệnh test đã chạy, số test PASS, và kết quả kiểm tra bằng mắt ở Step 10.

- [ ] **Step 12: Commit**

Run `detect_changes()` first, then:

```bash
git add components/ReferralChain.tsx components/HelpHotlines.tsx \
  components/LegalAidConsult.tsx app/tro-giup-phap-ly/page.tsx \
  app/styles/legal-aid.css app/globals.css app/page.tsx \
  tests/legal-aid.test.mjs docs/USER_STORIES.md docs/PROGRESS.md \
  docs/TECHNICAL_SPEC.md
git commit -m "$(cat <<'MSG'
feat: muc tro giup phap ly chi ra co quan co tham quyen (US-039)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CdZxsET16g6MFzg14Qiof
MSG
)"
```

---

## Sau khi xong GĐ1

Ba giai đoạn còn lại được lập plan riêng, mỗi plan chỉ bắt đầu khi `docs/PROGRESS.md` đã có bằng chứng của giai đoạn trước:

- **GĐ2** — kho văn bản pháp luật (US-040, US-041)
- **GĐ3** — bốn chuyên đề mới: phòng chống ma túy, an ninh trật tự trường học, game & không gian mạng, chuyên đề khác (US-042)
- **GĐ4** — rà soát trải nghiệm cho HSSV, bảng xếp hạng, phản hồi thí điểm (US-043, US-044, US-045)

Hai việc ngoài phạm vi mã nguồn vẫn đang chờ người dùng quyết, và chúng chặn việc phát hành chứ không chặn GĐ1:
1. **Tên miền cố định chưa có** (dòng 2 của bảng duyệt); Cloudflare đang kẹt vì chưa có `project_id`, trong khi `vercel.json` và `.vercel/` vẫn còn trong repo. GĐ1 vì vậy chỉ nghiệm thu cục bộ.
2. **Chưa chỉ định người duyệt nội dung**, nên bản nháp cơ quan sẽ nằm ở `draft` và không lên `published` được (ràng buộc bốn mắt ở Task 4 sẽ chặn đúng như thiết kế).
