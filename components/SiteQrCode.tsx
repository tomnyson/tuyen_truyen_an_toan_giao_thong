"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  createQrMatrix,
  isQrTargetUrl,
  qrSvgDataUrl,
  qrSvgMarkup,
  qrSvgPath,
} from "@/lib/qr-code";

// URL cấu hình sẵn (nếu có) dùng cho bản in đồng nhất giữa các máy; khi không
// có thì lấy origin thật lúc chạy. Origin chỉ đọc được sau khi mount nên QR
// render ở lần paint thứ hai — tránh lệch hydration giữa server và client.
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function resolveSiteUrl(configured: string, origin: string): string {
  if (isQrTargetUrl(configured)) return configured;
  return isQrTargetUrl(origin) ? origin : "";
}

// Origin là giá trị của trình duyệt, không tồn tại khi render trên server.
// Đọc qua useSyncExternalStore để snapshot server trả rỗng và client trả origin
// thật, thay vì setState trong effect gây render dây chuyền.
const subscribeToOrigin = () => () => {};
const readOrigin = () => window.location.origin;
const readServerOrigin = () => "";

export function SiteQrCode() {
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    readOrigin,
    readServerOrigin,
  );

  const siteUrl = resolveSiteUrl(configuredSiteUrl, origin);
  const qr = useMemo(() => {
    if (!siteUrl) return null;
    const matrix = createQrMatrix(siteUrl, "M");
    if (!matrix) return null;
    const quietZone = 4;
    const extent = matrix.size + quietZone * 2;
    return {
      extent,
      path: qrSvgPath(matrix, quietZone),
      downloadUrl: qrSvgDataUrl(
        qrSvgMarkup(matrix, { quietZone, title: siteUrl }),
      ),
    };
  }, [siteUrl]);

  return (
    <aside className="qr-block" aria-labelledby="qr-heading">
      <div className="qr-frame">
        {qr ? (
          <svg
            viewBox={`0 0 ${qr.extent} ${qr.extent}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={`Mã QR mở ${siteUrl}`}
          >
            <rect width={qr.extent} height={qr.extent} fill="#ffffff" />
            <path fill="#18213b" d={qr.path} />
          </svg>
        ) : (
          <span className="qr-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="qr-copy">
        <h3 id="qr-heading">Quét là tra được ngay</h3>
        <p>
          Dán mã ở bảng tin lớp hoặc phòng đoàn đội để học sinh mở thẳng trang
          tra cứu, không cần gõ địa chỉ.
        </p>
        {qr ? (
          <a
            className="qr-download"
            href={qr.downloadUrl}
            download="tro-giup-phap-ly-hssv-qr.svg"
          >
            Tải mã để in <span aria-hidden="true">↓</span>
          </a>
        ) : (
          <span className="qr-download is-disabled">Đang tạo mã…</span>
        )}
      </div>
    </aside>
  );
}
