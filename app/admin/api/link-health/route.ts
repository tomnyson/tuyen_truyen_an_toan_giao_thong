import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import { checkDomainHealth } from "@/lib/canonical-url";
import { batchCheckLinks, checkSingleLink } from "@/lib/link-checker";
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
    // Database fallback nếu chưa cấu hình Neon DB
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
    let found = false;
    cachedLinks = cachedLinks.map((item) => {
      if (item.url === rawUrl) {
        found = true;
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

    if (!found) {
      cachedLinks.push({
        id: `adhoc:${Date.now()}:${rawUrl}`,
        url: rawUrl,
        sourceType: "static_baseline",
        sourceId: "adhoc",
        sourceTitle: "Kiểm tra trực tiếp",
        field: "url",
        lastStatus: checkResult.status,
        lastCheckedAt: now,
        statusCode: checkResult.statusCode,
        redirectUrl: checkResult.redirectUrl,
        responseTimeMs: checkResult.responseTimeMs,
        error: checkResult.error,
      });
    }

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
