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
      // Một số trang từ chối HEAD (405) hoặc drop connection, fallback GET với Range
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
