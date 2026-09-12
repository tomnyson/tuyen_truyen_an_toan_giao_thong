# Cấp Tên Miền Cố Định & Quản Trị Kiểm Tra Link Hết Hạn (US-046) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cung cấp giải pháp định danh tên miền và đường dẫn vĩnh viễn (canonical URL / permalinks cho QR code, tình huống, tra cứu) tránh việc phải cấp lại link định kỳ, và xây dựng chức năng quản trị trong CMS để tự động kiểm tra tính khả dụng của toàn bộ liên kết trong hệ thống (phát hiện link chết, 404, redirect 301, hết hạn, lỗi SSL) có thống kê và điều hướng sửa đổi nhanh.

**Architecture:** Tập trung hóa cấu hình tên miền qua `lib/canonical-url.ts` để sinh permalink bất biến và đảm bảo QR code tải xuống luôn mã hóa canonical domain thay vì origin tạm thời; xây dựng engine phát hiện và kiểm tra liên kết `lib/link-checker.ts` và `lib/link-health.ts` có cơ chế bảo vệ SSRF (chặn IP private/loopback) và kiểm soát tải song song (concurrency limit); cung cấp Admin API bảo mật (`/admin/api/link-health`) và giao diện `LinkHealthManager.tsx` tích hợp vào CMS Dashboard để quản trị viên có thể kiểm tra từng link hoặc quét toàn bộ hệ thống bất cứ lúc nào.

**Tech Stack:** TypeScript, Next.js / Vinext, Web Native Fetch & AbortController, Node.js Test Runner (`node:test`), Drizzle ORM / Neon PG (với fallback an toàn nếu database offline).

## Global Constraints

- Phù hợp dòng 2 của bảng danh mục duyệt: *“Truy cập & liên kết — Xử lý link hết hạn — Cấp tên miền/đường dẫn cố định, sử dụng lâu dài; tránh phải cấp lại link mới định kỳ xay dung chuc nang admin kiem tra link het han”*.
- Kiểm tra liên kết phía server bắt buộc có SSRF guard: chặn các dải IP riêng tư (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16), IPv6 loopback `::1`, và các protocol không phải `http:`/`https:`.
- Cơ chế kiểm tra batch link phải có giới hạn concurrency (mặc định 5 request đồng thời) và timeout (mặc định 5.000ms) để không gây nghẽn tài nguyên hoặc bị tường lửa chặn.
- QR Code và liên kết chia sẻ công khai không bị ảnh hưởng tiêu cực: luôn ưu tiên canonical domain được cấu hình (`NEXT_PUBLIC_SITE_URL` hoặc `CANONICAL_DOMAIN`), fallback về window origin khi chưa cấu hình.
- Tuân thủ nghiêm ngặt `AGENTS.md`: đăng ký User Story `US-046`, quyết định kỹ thuật `DEC-026`, cập nhật `docs/PROGRESS.md`, kiểm thử TDD, không có placeholder, TypeScript biên dịch sạch.

---

### Task 1: Khai báo User Story US-046 & Quyết định kiến trúc DEC-026

**Files:**
- Modify: `docs/USER_STORIES.md:1723-1723`
- Modify: `docs/TECHNICAL_SPEC.md:2350-2380`
- Modify: `docs/PROGRESS.md:30-36`

**Interfaces:**
- Consumes: Quy ước tài liệu dự án trong `AGENTS.md`.
- Produces: Story `US-046` với các acceptance criteria rõ ràng; `DEC-026` quy định kiến trúc canonical URL và link health check; cập nhật bảng tổng quan `PROGRESS.md`.

- [ ] **Step 1: Viết nội dung User Story US-046 vào `docs/USER_STORIES.md`**

Thêm vào cuối `docs/USER_STORIES.md`:

```markdown
### [ ] US-046 — Cấp tên miền cố định và quản trị kiểm tra link hết hạn

- **Priority:** P0
- **Persona:** Quản trị viên, Nhà trường, Học sinh
- **Mô tả:** Là quản trị viên và người triển khai tại trường học, tôi muốn hệ thống có tên miền/đường dẫn cố định để QR code và liên kết không bị hết hạn định kỳ, đồng thời có công cụ trong CMS để quét và kiểm tra các liên kết trong hệ thống xem có bị hỏng, đổi link hoặc hết hạn hay không.
- **Dòng sheet:** 2 (Truy cập & liên kết)

**Acceptance criteria**

- [ ] Cấu hình tên miền cố định (`NEXT_PUBLIC_SITE_URL` / `CANONICAL_DOMAIN`) được quản lý tập trung tại `lib/canonical-url.ts`, hỗ trợ kiểm tra tính hợp lệ và chuẩn hóa HTTPS.
- [ ] QR code tải về và các permalink chia sẻ luôn gắn với canonical domain cố định, không bị phụ thuộc vào URL tạm thời của máy phát triển hay bản xem trước.
- [ ] Engine kiểm tra liên kết `lib/link-checker.ts` có SSRF guard chặn truy cập vào IP nội bộ (localhost, 127.0.0.1, 10.x, 192.168.x, 172.16-31.x, link-local), chỉ chấp nhận HTTP/HTTPS.
- [ ] Quá trình quét link hỗ trợ HEAD với fallback GET, tự động phát hiện mã trạng thái (200 OK, 301/302 Redirect kèm URL đích, 404/5xx Broken, Timeout) với timeout 5 giây và giới hạn concurrency 5 luồng song song.
- [ ] Tập hợp liên kết `lib/link-health.ts` tự động gom các link từ: nguồn văn bản (`legal_sources`), tình huống (`showcases.sourceUrl` & `mediaUrl`), nội dung nền (`lib/legal-content.ts`), và đầu mối trợ giúp (`referral_authorities`).
- [ ] Admin API `GET /admin/api/link-health` và `POST /admin/api/link-health` được bảo vệ bởi phiên đăng nhập quản trị và CSRF origin check; hỗ trợ quét toàn bộ (`scan_all`), kiểm tra link lẻ (`check_single`) và kiểm tra tình trạng tên miền (`verify_domain`).
- [ ] Giao diện CMS có tab "Liên kết & Tên miền" hiển thị trạng thái tên miền cố định, các chỉ số thống kê link (Tổng số, Hoạt động, Chuyển hướng, Hỏng/Hết hạn), nút quét toàn bộ và bảng danh sách có bộ lọc nhanh, điều hướng sửa đổi.
- [ ] Đầy đủ unit tests và API tests bao phủ SSRF protection, link crawler, concurrency limiter, canonical URL resolver và admin route authorization.
```

- [ ] **Step 2: Thêm DEC-026 vào `docs/TECHNICAL_SPEC.md`**

Ghi nhận quyết định kiến trúc `DEC-026`:
- `DEC-026`: Tên miền cố định sử dụng biến môi trường chuẩn `NEXT_PUBLIC_SITE_URL` / `CANONICAL_DOMAIN`. Cơ chế kiểm tra link chạy hoàn toàn ở server-side qua fetch API có timeout 5s, SSRF guard chặn private IP, không lưu dữ liệu nhạy cảm, và phân loại 4 trạng thái rõ ràng (`ok`, `redirect`, `broken`, `timeout`).

- [ ] **Step 3: Cập nhật dòng theo dõi vào `docs/PROGRESS.md`**

Thêm `US-046` vào bảng theo dõi `docs/PROGRESS.md` với trạng thái `Todo` hoặc `In Progress`.

- [ ] **Step 4: Commit tài liệu**

```bash
git add docs/USER_STORIES.md docs/TECHNICAL_SPEC.md docs/PROGRESS.md
git commit -m "docs: khai bao US-046 va DEC-026 ve ten mien co dinh va kiem tra link het han"
```

---

### Task 2: Xây dựng Module Tên miền cố định & URL vĩnh viễn (`lib/canonical-url.ts`)

**Files:**
- Create: `lib/canonical-url.ts`
- Create: `tests/canonical-url.test.mjs`
- Modify: `components/SiteQrCode.tsx`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SITE_URL`, `process.env.CANONICAL_DOMAIN`.
- Produces:
  ```typescript
  export type DomainHealthResult = Readonly<{
    configuredUrl: string;
    normalizedOrigin: string;
    isConfigured: boolean;
    isHttps: boolean;
    reachable: boolean;
    statusCode?: number;
    responseTimeMs?: number;
    error?: string;
  }>;

  export function getCanonicalDomain(configured?: string): string;
  export function resolveCanonicalSiteUrl(configured?: string, fallbackOrigin?: string): string;
  export function buildCanonicalPermalink(path: string, configured?: string): string;
  export function buildSituationPermalink(topic: string, id: number | string): string;
  export function buildDocumentPermalink(id: number | string): string;
  export async function checkDomainHealth(domainUrl?: string, timeoutMs?: number): Promise<DomainHealthResult>;
  ```

- [ ] **Step 1: Viết failing test `tests/canonical-url.test.mjs`**

Tạo `tests/canonical-url.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalDomain,
  resolveCanonicalSiteUrl,
  buildCanonicalPermalink,
  buildSituationPermalink,
  buildDocumentPermalink,
  checkDomainHealth,
} from "../lib/canonical-url.ts";

test("getCanonicalDomain chuan hoa domain va bo dau gach cheo cuoi", () => {
  assert.equal(getCanonicalDomain("https://luathocduong.edu.vn/"), "https://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("http://luathocduong.edu.vn"), "http://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("   https://luathocduong.edu.vn   "), "https://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("not-a-valid-url"), "");
  assert.equal(getCanonicalDomain(""), "");
  assert.equal(getCanonicalDomain(undefined), "");
});

test("resolveCanonicalSiteUrl uu tien ten mien cau hinh roi moi den fallback origin", () => {
  const configured = "https://luathocduong.edu.vn";
  const previewOrigin = "https://tuyentruyen-preview-123.vercel.app";
  
  // Khi co domain cau hinh, luon lay domain cau hinh de QR code khong bi het han
  assert.equal(resolveCanonicalSiteUrl(configured, previewOrigin), "https://luathocduong.edu.vn");
  // Khi khong co domain cau hinh, fallback ve preview origin
  assert.equal(resolveCanonicalSiteUrl("", previewOrigin), "https://tuyentruyen-preview-123.vercel.app");
  // Khi ca 2 deu khong hop le thi tra ve rong
  assert.equal(resolveCanonicalSiteUrl("", ""), "");
});

test("buildCanonicalPermalink tao duong dan vinh vien chuan", () => {
  const base = "https://luathocduong.edu.vn";
  assert.equal(buildCanonicalPermalink("/tro-giup-phap-ly", base), "https://luathocduong.edu.vn/tro-giup-phap-ly");
  assert.equal(buildCanonicalPermalink("van-ban", base), "https://luathocduong.edu.vn/van-ban");
});

test("buildSituationPermalink tao permalink tinh huong chuan hoa", () => {
  const link = buildSituationPermalink("Giao thông", 1);
  assert.ok(link.includes("id=1") || link.includes("#tinh-huong-1"));
});

test("checkDomainHealth bao cao chua cau hinh neu truyen rong", async () => {
  const result = await checkDomainHealth("");
  assert.equal(result.isConfigured, false);
  assert.equal(result.reachable, false);
});
```

- [ ] **Step 2: Chạy test để xác nhận test fail (RED)**

```bash
node --test tests/canonical-url.test.mjs
```
Kỳ vọng: Lỗi `Cannot find module '../lib/canonical-url.ts'`.

- [ ] **Step 3: Triển khai `lib/canonical-url.ts`**

Tạo file `lib/canonical-url.ts`:
```typescript
// Module quan ly ten mien co dinh va duong dan vinh vien (US-046, DEC-026).
// Giup QR code va cac lien ket chia se giu nguyen gia tri lau dai, tranh viec
// phai in lai ma QR hoac cap lai link moi dinh ky khi doi server/preview deployment.

export type DomainHealthResult = Readonly<{
  configuredUrl: string;
  normalizedOrigin: string;
  isConfigured: boolean;
  isHttps: boolean;
  reachable: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}>;

export function getCanonicalDomain(configured?: string): string {
  const raw = (configured ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CANONICAL_DOMAIN ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

export function resolveCanonicalSiteUrl(configured?: string, fallbackOrigin?: string): string {
  const canonical = getCanonicalDomain(configured);
  if (canonical) return canonical;
  if (!fallbackOrigin) return "";
  try {
    const parsed = new URL(fallbackOrigin.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // fallback khong hop le
  }
  return "";
}

export function buildCanonicalPermalink(path: string, configured?: string): string {
  const domain = resolveCanonicalSiteUrl(configured);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return domain ? `${domain}${cleanPath}` : cleanPath;
}

export function buildSituationPermalink(topic: string, id: number | string, configured?: string): string {
  const encodedTopic = encodeURIComponent(topic);
  return buildCanonicalPermalink(`/?topic=${encodedTopic}&id=${id}#tinh-huong-${id}`, configured);
}

export function buildDocumentPermalink(id: number | string, configured?: string): string {
  return buildCanonicalPermalink(`/van-ban/${id}`, configured);
}

export async function checkDomainHealth(
  domainUrl?: string,
  timeoutMs = 5000,
): Promise<DomainHealthResult> {
  const target = getCanonicalDomain(domainUrl);
  if (!target) {
    return {
      configuredUrl: domainUrl ?? "",
      normalizedOrigin: "",
      isConfigured: false,
      isHttps: false,
      reachable: false,
      error: "Tên miền chưa được cấu hình hoặc sai định dạng URL.",
    };
  }

  const isHttps = target.startsWith("https://");
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(target, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "LuatHocDuong-DomainHealthChecker/1.0",
      },
    });
    clearTimeout(timeoutId);
    return {
      configuredUrl: target,
      normalizedOrigin: target,
      isConfigured: true,
      isHttps,
      reachable: response.ok || response.status < 500,
      statusCode: response.status,
      responseTimeMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : "Không thể kết nối đến tên miền";
    return {
      configuredUrl: target,
      normalizedOrigin: target,
      isConfigured: true,
      isHttps,
      reachable: false,
      responseTimeMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
```

- [ ] **Step 4: Cập nhật `components/SiteQrCode.tsx` dùng `resolveCanonicalSiteUrl`**

Chỉnh sửa `components/SiteQrCode.tsx` để import và sử dụng hàm `resolveCanonicalSiteUrl` từ `@/lib/canonical-url`:
```typescript
import { resolveCanonicalSiteUrl } from "@/lib/canonical-url";
// ...
const siteUrl = resolveCanonicalSiteUrl(configuredSiteUrl, origin);
```

- [ ] **Step 5: Chạy lại test `tests/canonical-url.test.mjs` và `tests/qr-code.test.mjs` (GREEN)**

```bash
node --test tests/canonical-url.test.mjs
node --test tests/qr-code.test.mjs
npx tsc --noEmit
```
Kỳ vọng: Tất cả tests pass 100%, tsc không có lỗi.

- [ ] **Step 6: Commit Task 2**

```bash
git add lib/canonical-url.ts tests/canonical-url.test.mjs components/SiteQrCode.tsx
git commit -m "feat: module ten mien co dinh va duong dan vinh vien (US-046)"
```

---

### Task 3: Xây dựng Engine kiểm tra liên kết an toàn & Bộ trích xuất (`lib/link-checker.ts` & `lib/link-health.ts`)

**Files:**
- Create: `lib/link-checker.ts`
- Create: `lib/link-health.ts`
- Create: `tests/link-checker.test.mjs`

**Interfaces:**
- Consumes: `lib/legal-content.ts`, `db/pg-schema.ts`.
- Produces:
  ```typescript
  export type LinkStatus = "ok" | "redirect" | "broken" | "timeout" | "ssl_error" | "blocked_ssrf" | "unchecked";

  export type LinkItem = Readonly<{
    id: string; // generated unique key
    url: string;
    sourceType: "legal_source" | "showcase_source" | "showcase_media" | "static_baseline" | "authority";
    sourceId: number | string;
    sourceTitle: string;
    field: string;
    lastStatus: LinkStatus;
    lastCheckedAt?: string;
    statusCode?: number;
    redirectUrl?: string;
    responseTimeMs?: number;
    error?: string;
  }>;

  export function isSafeUrlToCheck(url: string): { safe: boolean; reason?: string };
  export async function checkSingleLink(url: string, timeoutMs?: number): Promise<{
    status: LinkStatus;
    statusCode?: number;
    redirectUrl?: string;
    responseTimeMs?: number;
    error?: string;
  }>;
  export async function batchCheckLinks<T extends { url: string }>(
    items: T[],
    concurrency?: number,
    timeoutMs?: number,
  ): Promise<Array<T & { checkResult: Awaited<ReturnType<typeof checkSingleLink>> }>>;
  export async function extractSystemLinks(dbClient?: unknown): Promise<LinkItem[]>;
  ```

- [ ] **Step 1: Viết failing test `tests/link-checker.test.mjs`**

Tạo `tests/link-checker.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { isSafeUrlToCheck, checkSingleLink, batchCheckLinks } from "../lib/link-checker.ts";
import { extractSystemLinks } from "../lib/link-health.ts";

test("isSafeUrlToCheck chan cac dia chi IP noi bo (SSRF guard)", () => {
  // Cac dia chi cam truy cap
  assert.equal(isSafeUrlToCheck("http://localhost:3000").safe, false);
  assert.equal(isSafeUrlToCheck("http://127.0.0.1:8080").safe, false);
  assert.equal(isSafeUrlToCheck("http://10.0.0.1/admin").safe, false);
  assert.equal(isSafeUrlToCheck("http://192.168.1.1").safe, false);
  assert.equal(isSafeUrlToCheck("http://172.16.0.5").safe, false);
  assert.equal(isSafeUrlToCheck("http://169.254.169.254/latest/meta-data/").safe, false);
  assert.equal(isSafeUrlToCheck("ftp://example.com").safe, false);
  assert.equal(isSafeUrlToCheck("javascript:alert(1)").safe, false);

  // Cac dia chi hop le
  assert.equal(isSafeUrlToCheck("https://vbpl.vn").safe, true);
  assert.equal(isSafeUrlToCheck("https://chinhphu.vn").safe, true);
  assert.equal(isSafeUrlToCheck("https://youtube.com/watch?v=123").safe, true);
});

test("checkSingleLink phan loai blocked_ssrf cho dia chi cam", async () => {
  const result = await checkSingleLink("http://127.0.0.1:9999");
  assert.equal(result.status, "blocked_ssrf");
  assert.ok(result.error);
});

test("batchCheckLinks gioi han concurrency va xu ly dung danh sach", async () => {
  const items = [
    { id: "1", url: "https://vbpl.vn" },
    { id: "2", url: "http://127.0.0.1:80" },
  ];
  const results = await batchCheckLinks(items, 2);
  assert.equal(results.length, 2);
  assert.equal(results[1].checkResult.status, "blocked_ssrf");
});

test("extractSystemLinks gom duoc cac lien ket tu du lieu nen static", async () => {
  const links = await extractSystemLinks(null);
  assert.ok(links.length > 0);
  const helmetLink = links.find((l) => l.url.includes("vbpl.vn"));
  assert.ok(helmetLink, "Phai tim thay link vbpl tu citation mu bao hiem");
  assert.equal(helmetLink.sourceType, "static_baseline");
});
```

- [ ] **Step 2: Chạy test để xác nhận test fail (RED)**

```bash
node --test tests/link-checker.test.mjs
```
Kỳ vọng: Module not found.

- [ ] **Step 3: Triển khai `lib/link-checker.ts`**

Tạo file `lib/link-checker.ts`:
```typescript
// Engine kiem tra tinh kha dung cua lien ket (US-046, DEC-026).
// Ho tro HEAD/GET, phat hien 301/302 Redirect, 404/5xx Broken, Timeout,
// va SSRF Guard ngan chan truy cap vao mang noi bo.

export type LinkStatus =
  | "ok"
  | "redirect"
  | "broken"
  | "timeout"
  | "ssl_error"
  | "blocked_ssrf"
  | "network_error"
  | "unchecked";

export type LinkCheckResult = Readonly<{
  status: LinkStatus;
  statusCode?: number;
  statusText?: string;
  redirectUrl?: string;
  responseTimeMs?: number;
  error?: string;
}>;

// Kiem tra SSRF: chan IP Loopback, Private RFC 1918, Link-local, IPv6
export function isSafeUrlToCheck(rawUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Giao thức không được hỗ trợ (chỉ nhận HTTP/HTTPS)." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Chặn localhost & internal names
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { safe: false, reason: "Chặn truy cập tên miền nội bộ (localhost/internal)." };
    }

    // Chặn IPv6 loopback
    if (hostname === "::1" || hostname === "[::1]") {
      return { safe: false, reason: "Chặn truy cập IPv6 loopback." };
    }

    // Chặn dải IP private & loopback IPv4
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, o1, o2] = match.map(Number);
      if (o1 === 127) return { safe: false, reason: "Chặn dải IP loopback 127.0.0.0/8." };
      if (o1 === 10) return { safe: false, reason: "Chặn dải IP riêng tư 10.0.0.0/8." };
      if (o1 === 169 && o2 === 254) return { safe: false, reason: "Chặn dải IP link-local 169.254.0.0/16." };
      if (o1 === 192 && o2 === 168) return { safe: false, reason: "Chặn dải IP riêng tư 192.168.0.0/16." };
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return { safe: false, reason: "Chặn dải IP riêng tư 172.16.0.0/12." };
      if (o1 === 0) return { safe: false, reason: "Chặn địa chỉ IP 0.0.0.0." };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "Định dạng URL không hợp lệ." };
  }
}

export async function checkSingleLink(
  rawUrl: string,
  timeoutMs = 5000,
): Promise<LinkCheckResult> {
  const safety = isSafeUrlToCheck(rawUrl);
  if (!safety.safe) {
    return {
      status: "blocked_ssrf",
      error: safety.reason,
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Thử HEAD trước để tiết kiệm băng thông
    let response: Response;
    try {
      response = await fetch(rawUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual", // Để phát hiện redirect 301/302
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LuatHocDuong-LinkChecker/1.0)",
        },
      });
    } catch {
      // Một số trang từ chối HEAD (405) hoặc drop connection, fallback GET với stream ngắt sớm
      response = await fetch(rawUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LuatHocDuong-LinkChecker/1.0)",
          "Range": "bytes=0-1024",
        },
      });
    }

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const statusCode = response.status;
    const statusText = response.statusText;

    // Phân loại Redirect
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get("location") ?? "";
      let redirectUrl = location;
      try {
        redirectUrl = new URL(location, rawUrl).toString();
      } catch {
        // Giữ nguyên chuỗi nếu parse lỗi
      }
      return {
        status: "redirect",
        statusCode,
        statusText,
        redirectUrl,
        responseTimeMs: duration,
      };
    }

    // Phân loại OK (200..299)
    if (statusCode >= 200 && statusCode < 300) {
      return {
        status: "ok",
        statusCode,
        statusText,
        responseTimeMs: duration,
      };
    }

    // Phân loại Broken (400+)
    return {
      status: "broken",
      statusCode,
      statusText: statusText || `HTTP ${statusCode}`,
      responseTimeMs: duration,
      error: `Máy chủ phản hồi mã lỗi HTTP ${statusCode}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      return {
        status: "timeout",
        responseTimeMs: duration,
        error: `Quá thời gian chờ phản hồi (${timeoutMs}ms).`,
      };
    }

    const message = err instanceof Error ? err.message : "Lỗi kết nối mạng";
    const isSsl = message.toLowerCase().includes("certificate") || message.toLowerCase().includes("ssl");

    return {
      status: isSsl ? "ssl_error" : "network_error",
      responseTimeMs: duration,
      error: message,
    };
  }
}

// Chạy kiểm tra song song với số luồng giới hạn
export async function batchCheckLinks<T extends { url: string }>(
  items: T[],
  concurrency = 5,
  timeoutMs = 5000,
): Promise<Array<T & { checkResult: LinkCheckResult }>> {
  const results: Array<T & { checkResult: LinkCheckResult }> = [];
  const queue = [...items];
  const executing = new Set<Promise<void>>();

  for (const item of queue) {
    const p: Promise<void> = (async () => {
      const res = await checkSingleLink(item.url, timeoutMs);
      results.push({ ...item, checkResult: res });
    })();

    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
```

- [ ] **Step 4: Triển khai `lib/link-health.ts` (Gom toàn bộ link trong hệ thống)**

Tạo file `lib/link-health.ts`:
```typescript
// Trích xuất và tổng hợp toàn bộ liên kết trong hệ thống để quản trị kiểm tra (US-046).
import { laws } from "./legal-content";
import type { LinkCheckResult, LinkStatus } from "./link-checker";

export type LinkSourceType =
  | "legal_source"
  | "showcase_source"
  | "showcase_media"
  | "static_baseline"
  | "authority";

export type LinkHealthItem = Readonly<{
  id: string;
  url: string;
  sourceType: LinkSourceType;
  sourceId: number | string;
  sourceTitle: string;
  field: string;
  lastStatus: LinkStatus;
  lastCheckedAt?: string;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs?: number;
  error?: string;
}>;

export type LinkHealthSummary = Readonly<{
  total: number;
  ok: number;
  redirect: number;
  broken: number;
  timeout: number;
  unchecked: number;
  lastScannedAt?: string;
}>;

// Trích xuất links từ static baseline và DB (nếu có DB client truyền vào)
export async function extractSystemLinks(dbClient?: unknown): Promise<LinkHealthItem[]> {
  const extracted: LinkHealthItem[] = [];
  const seenUrls = new Set<string>();

  function addLink(
    url: string | null | undefined,
    sourceType: LinkSourceType,
    sourceId: number | string,
    sourceTitle: string,
    field: string,
  ) {
    if (!url || typeof url !== "string") return;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return;

    const key = `${sourceType}:${sourceId}:${cleanUrl}`;
    if (seenUrls.has(key)) return;
    seenUrls.add(key);

    extracted.push({
      id: key,
      url: cleanUrl,
      sourceType,
      sourceId,
      sourceTitle: sourceTitle.slice(0, 160),
      field,
      lastStatus: "unchecked",
    });
  }

  // 1. Static baseline trong legal-content
  for (const law of laws) {
    if (law.citation?.officialUrl) {
      addLink(
        law.citation.officialUrl,
        "static_baseline",
        law.id,
        law.title,
        "citation.officialUrl",
      );
    }
  }

  // 2. Database records nếu có dbClient
  if (dbClient && typeof (dbClient as { query?: unknown }).query === "function") {
    try {
      const client = dbClient as {
        query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
      };
      
      // Quản lý showcases
      const showcaseRes = await client.query(
        "SELECT id, title, source_url, media_url FROM showcases",
      );
      for (const row of showcaseRes.rows ?? []) {
        if (row.source_url) {
          addLink(row.source_url as string, "showcase_source", row.id as number, row.title as string, "sourceUrl");
        }
        if (row.media_url) {
          addLink(row.media_url as string, "showcase_media", row.id as number, row.title as string, "mediaUrl");
        }
      }

      // Quản lý legal_sources
      const sourceRes = await client.query(
        "SELECT id, title, official_url FROM legal_sources",
      );
      for (const row of sourceRes.rows ?? []) {
        if (row.official_url) {
          addLink(row.official_url as string, "legal_source", row.id as number, row.title as string, "officialUrl");
        }
      }
    } catch {
      // Nếu query database lỗi (vd database offline), giữ nguyên danh sách static baseline an toàn
    }
  }

  return extracted;
}

export function computeLinkSummary(
  links: readonly LinkHealthItem[],
  lastScannedAt?: string,
): LinkHealthSummary {
  let ok = 0;
  let redirect = 0;
  let broken = 0;
  let timeout = 0;
  let unchecked = 0;

  for (const item of links) {
    switch (item.lastStatus) {
      case "ok":
        ok++;
        break;
      case "redirect":
        redirect++;
        break;
      case "broken":
      case "blocked_ssrf":
      case "ssl_error":
      case "network_error":
        broken++;
        break;
      case "timeout":
        timeout++;
        break;
      default:
        unchecked++;
        break;
    }
  }

  return {
    total: links.length,
    ok,
    redirect,
    broken,
    timeout,
    unchecked,
    lastScannedAt,
  };
}
```

- [ ] **Step 5: Chạy lại tests `tests/link-checker.test.mjs` (GREEN)**

```bash
node --test tests/link-checker.test.mjs
npx tsc --noEmit
```
Kỳ vọng: Pass 100%, không có lỗi typecheck.

- [ ] **Step 6: Commit Task 3**

```bash
git add lib/link-checker.ts lib/link-health.ts tests/link-checker.test.mjs
git commit -m "feat: engine kiem tra lien ket an toan va gom link he thong (US-046)"
```

---

### Task 4: Xây dựng Admin API `/admin/api/link-health`

**Files:**
- Create: `app/admin/api/link-health/route.ts`
- Create: `tests/link-health-api.test.mjs`

**Interfaces:**
- Consumes: `isAdminRequest`, `hasTrustedOrigin` từ `lib/admin-auth.ts`, `lib/link-health.ts`, `lib/link-checker.ts`, `lib/canonical-url.ts`, `getInitializedDb` từ `db/index.ts`.
- Produces:
  - `GET /admin/api/link-health`:
    - Response: `{ ok: true, domain: DomainHealthResult, summary: LinkHealthSummary, links: LinkHealthItem[] }`
  - `POST /admin/api/link-health`:
    - Body: `{ action: "scan_all" | "check_single" | "verify_domain", url?: string }`
    - Response: updated results tương ứng.

- [ ] **Step 1: Viết failing test `tests/link-health-api.test.mjs`**

Tạo `tests/link-health-api.test.mjs`:
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/admin/api/link-health/route.ts";

test("GET /admin/api/link-health tu choi request khong co session admin", async () => {
  const req = new Request("http://localhost/admin/api/link-health", {
    headers: {},
  });
  const res = await GET(req);
  assert.equal(res.status, 401);
});

test("POST /admin/api/link-health tu choi request khong hop le", async () => {
  const req = new Request("http://localhost/admin/api/link-health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unknown" }),
  });
  const res = await POST(req);
  // Bi chan o auth hoac validate
  assert.ok(res.status === 401 || res.status === 400 || res.status === 403);
});
```

- [ ] **Step 2: Chạy test xác nhận test fail (RED)**

```bash
node --test tests/link-health-api.test.mjs
```
Kỳ vọng: Module `app/admin/api/link-health/route.ts` not found.

- [ ] **Step 3: Triển khai `app/admin/api/link-health/route.ts`**

Tạo file `app/admin/api/link-health/route.ts`:
```typescript
import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import {
  checkDomainHealth,
  getCanonicalDomain,
} from "@/lib/canonical-url";
import {
  batchCheckLinks,
  checkSingleLink,
  isSafeUrlToCheck,
} from "@/lib/link-checker";
import {
  computeLinkSummary,
  extractSystemLinks,
  type LinkHealthItem,
} from "@/lib/link-health";
import { getInitializedDb } from "@/db";

// In-memory cache lưu kết quả lần quét gần nhất để admin tải nhanh
let cachedLinks: LinkHealthItem[] = [];
let lastScannedAt: string | undefined = undefined;

async function authorize(request: Request, checkOrigin = false) {
  const authorized = await isAdminRequest(request);
  if (!authorized) {
    return Response.json({ error: "Yêu cầu đăng nhập quản trị." }, { status: 401 });
  }
  if (checkOrigin && !hasTrustedOrigin(request)) {
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await authorize(request, false);
  if (denied) return denied;

  let db: unknown = null;
  try {
    db = await getInitializedDb();
  } catch {
    // Database fallback
  }

  // Nếu cache trống, khởi tạo danh sách từ hệ thống
  if (cachedLinks.length === 0) {
    cachedLinks = await extractSystemLinks(db);
  }

  const domainStatus = await checkDomainHealth();
  const summary = computeLinkSummary(cachedLinks, lastScannedAt);

  return Response.json({
    ok: true,
    domain: domainStatus,
    summary,
    links: cachedLinks,
  });
}

export async function POST(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action as string | undefined;

  // 1. Quét toàn bộ liên kết
  if (action === "scan_all") {
    let db: unknown = null;
    try {
      db = await getInitializedDb();
    } catch {
      // database fallback
    }

    const freshLinks = await extractSystemLinks(db);
    const checked = await batchCheckLinks(freshLinks, 5, 5000);

    lastScannedAt = new Date().toISOString();
    cachedLinks = checked.map((item) => ({
      id: item.id,
      url: item.url,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceTitle: item.sourceTitle,
      field: item.field,
      lastStatus: item.checkResult.status,
      lastCheckedAt: lastScannedAt,
      statusCode: item.checkResult.statusCode,
      redirectUrl: item.checkResult.redirectUrl,
      responseTimeMs: item.checkResult.responseTimeMs,
      error: item.checkResult.error,
    }));

    const summary = computeLinkSummary(cachedLinks, lastScannedAt);
    return Response.json({
      ok: true,
      summary,
      links: cachedLinks,
    });
  }

  // 2. Kiểm tra một liên kết cụ thể
  if (action === "check_single") {
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return Response.json({ error: "URL không được để trống." }, { status: 400 });
    }

    const checkResult = await checkSingleLink(rawUrl, 5000);

    // Cập nhật vào cache nếu link có trong danh sách
    const now = new Date().toISOString();
    cachedLinks = cachedLinks.map((item) => {
      if (item.url === rawUrl) {
        return {
          ...item,
          lastStatus: checkResult.status,
          lastCheckedAt: now,
          statusCode: checkResult.statusCode,
          redirectUrl: checkResult.redirectUrl,
          responseTimeMs: checkResult.responseTimeMs,
          error: checkResult.error,
        };
      }
      return item;
    });

    return Response.json({
      ok: true,
      url: rawUrl,
      result: checkResult,
      links: cachedLinks,
      summary: computeLinkSummary(cachedLinks, lastScannedAt),
    });
  }

  // 3. Kiểm tra kết nối tên miền
  if (action === "verify_domain") {
    const domainStatus = await checkDomainHealth(undefined, 5000);
    return Response.json({
      ok: true,
      domain: domainStatus,
    });
  }

  return Response.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
```

- [ ] **Step 4: Chạy test `tests/link-health-api.test.mjs` (GREEN)**

```bash
node --test tests/link-health-api.test.mjs
npx tsc --noEmit
```
Kỳ vọng: Pass 100%.

- [ ] **Step 5: Commit Task 4**

```bash
git add app/admin/api/link-health/route.ts tests/link-health-api.test.mjs
git commit -m "feat: admin api kiem tra link va ten mien co dinh (US-046)"
```

---

### Task 5: Giao diện Quản trị Liên kết & Tên miền (`LinkHealthManager.tsx` & `AdminDashboard.tsx`)

**Files:**
- Create: `app/admin/LinkHealthManager.tsx`
- Modify: `app/admin/AdminDashboard.tsx:88-245`
- Create / Modify: `app/styles/link-health.css` (import vào `app/globals.css`)

**Interfaces:**
- Consumes: `/admin/api/link-health`, `brandDisplayName`, `LinkHealthItem`, `DomainHealthResult`.
- Produces: Tab quản trị "Liên kết & Tên miền" với:
  - Thẻ kiểm tra tên miền cố định + nút kiểm tra kết nối.
  - Thẻ thống kê 4 chỉ số (Tổng link, Hoạt động tốt, Chuyển hướng 301/302, Lỗi/Hết hạn 404/5xx).
  - Nút "Quét toàn bộ liên kết" có loading indicator và thông báo tiến độ.
  - Bộ lọc trạng thái (`all`, `broken`, `redirect`, `ok`) và thanh tìm kiếm URL/Tiêu đề.
  - Bảng danh sách liên kết có badge màu, mã HTTP, thời gian phản hồi (ms), nút "Kiểm tra lại" và nút "Mở liên kết".

- [ ] **Step 1: Tạo component `app/admin/LinkHealthManager.tsx`**

Tạo file `app/admin/LinkHealthManager.tsx`:
```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import type { DomainHealthResult } from "@/lib/canonical-url";
import type { LinkHealthItem, LinkHealthSummary } from "@/lib/link-health";

type FilterStatus = "all" | "broken" | "redirect" | "ok";

export function LinkHealthManager() {
  const [domain, setDomain] = useState<DomainHealthResult | null>(null);
  const [summary, setSummary] = useState<LinkHealthSummary | null>(null);
  const [links, setLinks] = useState<LinkHealthItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null);

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch("/admin/api/link-health", { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải thông tin liên kết.");
      const data = await res.json();
      setDomain(data.domain);
      setSummary(data.summary);
      setLinks(data.links ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleScanAll() {
    try {
      setIsScanning(true);
      setError("");
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan_all" }),
      });
      if (!res.ok) throw new Error("Quét liên kết thất bại.");
      const data = await res.json();
      setSummary(data.summary);
      setLinks(data.links ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi quét liên kết.");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleVerifyDomain() {
    try {
      setIsCheckingDomain(true);
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_domain" }),
      });
      if (!res.ok) throw new Error("Kiểm tra tên miền thất bại.");
      const data = await res.json();
      setDomain(data.domain);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra tên miền.");
    } finally {
      setIsCheckingDomain(false);
    }
  }

  async function handleCheckSingle(url: string) {
    try {
      setCheckingUrl(url);
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_single", url }),
      });
      if (!res.ok) throw new Error("Kiểm tra link thất bại.");
      const data = await res.json();
      setLinks(data.links ?? []);
      setSummary(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra liên kết.");
    } finally {
      setCheckingUrl(null);
    }
  }

  const filteredLinks = useMemo(() => {
    return links.filter((item) => {
      // Lọc theo trạng thái
      if (filter === "broken") {
        const isBroken = ["broken", "blocked_ssrf", "ssl_error", "network_error"].includes(item.lastStatus);
        if (!isBroken) return false;
      } else if (filter === "redirect") {
        if (item.lastStatus !== "redirect") return false;
      } else if (filter === "ok") {
        if (item.lastStatus !== "ok") return false;
      }

      // Lọc theo tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.url.toLowerCase().includes(q) || item.sourceTitle.toLowerCase().includes(q);
      }

      return true;
    });
  }, [links, filter, searchQuery]);

  function getStatusBadge(status: string, statusCode?: number) {
    switch (status) {
      case "ok":
        return <span className="badge badge-success">200 OK</span>;
      case "redirect":
        return <span className="badge badge-warning">{statusCode ?? "301"} Redirect</span>;
      case "broken":
      case "network_error":
      case "ssl_error":
        return <span className="badge badge-danger">{statusCode ? `HTTP ${statusCode}` : "Lỗi / Chết"}</span>;
      case "timeout":
        return <span className="badge badge-timeout">Timeout</span>;
      default:
        return <span className="badge badge-neutral">Chưa kiểm tra</span>;
    }
  }

  return (
    <div className="link-health-manager">
      {error && <div className="admin-alert admin-alert-danger">{error}</div>}

      {/* Card 1: Quản lý tên miền cố định */}
      <section className="domain-card">
        <div className="domain-card-header">
          <div>
            <h3>Tên miền &amp; Đường dẫn cố định</h3>
            <p>Đảm bảo học sinh và giáo viên dùng chung một tên miền vĩnh viễn, QR code in không bị hết hạn.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleVerifyDomain}
            disabled={isCheckingDomain}
          >
            {isCheckingDomain ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
          </button>
        </div>

        <div className="domain-status-box">
          <div className="domain-info-row">
            <span className="label">Tên miền cấu hình:</span>
            <code className="domain-value">
              {domain?.configuredUrl || "Chưa cấu hình (đang dùng fallback origin)"}
            </code>
            {domain?.isConfigured && (
              <span className={`status-pill ${domain.reachable ? "status-ok" : "status-error"}`}>
                {domain.reachable ? "● Đang hoạt động" : "● Không thể kết nối"}
              </span>
            )}
          </div>
          {domain?.responseTimeMs && (
            <p className="domain-meta">Thời gian phản hồi: {domain.responseTimeMs}ms | HTTPS: {domain.isHttps ? "Có" : "Không"}</p>
          )}
          {domain?.error && <p className="domain-error">{domain.error}</p>}
        </div>
      </section>

      {/* Card 2: Thống kê tình trạng liên kết */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{summary?.total ?? 0}</div>
          <div className="stat-label">Tổng liên kết</div>
        </div>
        <div className="stat-card stat-ok">
          <div className="stat-number">{summary?.ok ?? 0}</div>
          <div className="stat-label">Hoạt động tốt (200)</div>
        </div>
        <div className="stat-card stat-warn">
          <div className="stat-number">{summary?.redirect ?? 0}</div>
          <div className="stat-label">Chuyển hướng (301/302)</div>
        </div>
        <div className="stat-card stat-err">
          <div className="stat-number">{summary?.broken ?? 0}</div>
          <div className="stat-label">Hết hạn / Lỗi (404/5xx)</div>
        </div>
      </section>

      {/* Toolbar & Nút Quét */}
      <div className="link-toolbar">
        <div className="search-and-filters">
          <input
            type="search"
            placeholder="Tìm theo URL hoặc tên mục…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="filter-buttons">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              Tất cả ({links.length})
            </button>
            <button className={filter === "broken" ? "active" : ""} onClick={() => setFilter("broken")}>
              Lỗi / Hết hạn ({summary?.broken ?? 0})
            </button>
            <button className={filter === "redirect" ? "active" : ""} onClick={() => setFilter("redirect")}>
              Chuyển hướng ({summary?.redirect ?? 0})
            </button>
            <button className={filter === "ok" ? "active" : ""} onClick={() => setFilter("ok")}>
              Hoạt động ({summary?.ok ?? 0})
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleScanAll}
          disabled={isScanning || isLoading}
        >
          {isScanning ? "Đang quét toàn bộ…" : "Quét toàn bộ liên kết ngay"}
        </button>
      </div>

      {/* Bảng danh sách liên kết */}
      <div className="link-table-container">
        <table className="link-table">
          <thead>
            <tr>
              <th>Trạng thái</th>
              <th>Địa chỉ liên kết (URL)</th>
              <th>Vị trí / Nguồn</th>
              <th>Phản hồi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  {isLoading ? "Đang tải dữ liệu liên kết…" : "Không tìm thấy liên kết phù hợp."}
                </td>
              </tr>
            ) : (
              filteredLinks.map((item) => (
                <tr key={item.id}>
                  <td>{getStatusBadge(item.lastStatus, item.statusCode)}</td>
                  <td className="url-cell">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-href">
                      {item.url}
                    </a>
                    {item.redirectUrl && (
                      <div className="redirect-info">→ Chuyển đến: <code>{item.redirectUrl}</code></div>
                    )}
                    {item.error && <div className="error-info">{item.error}</div>}
                  </td>
                  <td className="source-cell">
                    <span className="source-title">{item.sourceTitle}</span>
                    <span className="source-meta">Loại: {item.sourceType}</span>
                  </td>
                  <td>
                    {item.responseTimeMs ? `${item.responseTimeMs}ms` : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCheckSingle(item.url)}
                      disabled={checkingUrl === item.url || isScanning}
                    >
                      {checkingUrl === item.url ? "Đang ktra…" : "Kiểm tra lại"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Cập nhật `app/admin/AdminDashboard.tsx` thêm tab `link_health`**

Chỉnh sửa `app/admin/AdminDashboard.tsx`:
1. Thêm `"link_health"` vào kiểu `Entity`:
```typescript
type Entity = "law" | "showcase" | "candidate" | "game" | "link_health";
```
2. Import `LinkHealthManager`:
```typescript
import { LinkHealthManager } from "./LinkHealthManager";
```
3. Thêm tab button vào `<nav className="admin-tabs">`:
```tsx
<button
  className={tab === "link_health" ? "active" : ""}
  onClick={() => { setTab("link_health"); resetForm(); }}
>
  Liên kết &amp; Tên miền
</button>
```
4. Render tab:
```tsx
{tab === "candidate" ? (
  <CandidatePanel />
) : tab === "game" ? (
  <GameManager />
) : tab === "link_health" ? (
  <LinkHealthManager />
) : (
  <div className="admin-grid">...</div>
)}
```

- [ ] **Step 3: Thêm CSS styling `app/styles/link-health.css`**

Tạo file `app/styles/link-health.css` với các kiểu dáng:
- `.domain-card`: card nền nổi bật, hiển thị code domain và status pill.
- `.stats-grid`: grid 4 thẻ thống kê trực quan.
- `.link-toolbar`: thanh tìm kiếm, bộ lọc tabs và nút Quét.
- `.link-table`: bảng dữ liệu responsive, status badges (`badge-success`, `badge-warning`, `badge-danger`).
Và thêm `@import "./styles/link-health.css";` vào `app/globals.css`.

- [ ] **Step 4: Kiểm tra TypeScript và chạy dev / build**

```bash
npx tsc --noEmit
```
Kỳ vọng: 0 errors.

- [ ] **Step 5: Commit Task 5**

```bash
git add app/admin/LinkHealthManager.tsx app/admin/AdminDashboard.tsx app/styles/link-health.css app/globals.css
git commit -m "feat: giao dien quan tri kiem tra link va ten mien co dinh (US-046)"
```

---

### Task 6: Kiểm thử toàn diện & Cập nhật Tiến độ

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Chạy toàn bộ các test suite liên quan đến US-046**

```bash
node --test tests/canonical-url.test.mjs
node --test tests/link-checker.test.mjs
node --test tests/link-health-api.test.mjs
node --test tests/qr-code.test.mjs
```
Kỳ vọng: 100% test pass.

- [ ] **Step 2: Chạy kiểm tra TypeScript và ESLint**

```bash
npx tsc --noEmit
npm run lint
```
Kỳ vọng: TypeScript sạch, 0 error mới từ ESLint.

- [ ] **Step 3: Chạy GitNexus detect_changes**

Sử dụng `call_mcp_tool` gitnexus `detect_changes` để kiểm tra phạm vi ảnh hưởng chỉ giới hạn ở các symbol liên quan.

- [ ] **Step 4: Cập nhật `docs/PROGRESS.md`**

Đánh dấu `[x]` cho US-046, ghi nhận evidence gồm các file code và test mới, cập nhật bảng tổng kết.

- [ ] **Step 5: Commit hoàn thiện**

```bash
git add docs/PROGRESS.md
git commit -m "docs: cap nhat tien do hoan tat US-046"
```
