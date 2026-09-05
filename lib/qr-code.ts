// QR truy cập nhanh trang tra cứu (US-037). Mã được sinh ngay trên client/build
// bằng thư viện thuần JS, không gọi dịch vụ sinh QR bên thứ ba — đường dẫn của
// trường học không bị gửi ra ngoài và QR vẫn hoạt động khi mạng chậm.

import qrcode from "qrcode-generator";

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export type QrMatrix = Readonly<{
  size: number;
  modules: readonly (readonly boolean[])[];
}>;

export type QrSvgOptions = Readonly<{
  quietZone?: number;
  dark?: string;
  light?: string;
  title?: string;
}>;

const maxQrPayloadLength = 900;

// Chỉ nhận URL http/https tuyệt đối: QR dán ở trường học không được trỏ tới
// `javascript:` hay chuỗi rác.
export function isQrTargetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      value.length <= maxQrPayloadLength
    );
  } catch {
    return false;
  }
}

export function createQrMatrix(
  value: string,
  errorCorrection: QrErrorCorrection = "M",
): QrMatrix | null {
  if (!isQrTargetUrl(value)) return null;
  try {
    // typeNumber 0 = tự chọn phiên bản nhỏ nhất đủ chứa dữ liệu.
    const code = qrcode(0, errorCorrection);
    code.addData(value, "Byte");
    code.make();
    const size = code.getModuleCount();
    const modules = Array.from({ length: size }, (_, row) =>
      Object.freeze(
        Array.from({ length: size }, (_, column) => code.isDark(row, column)),
      ),
    );
    return Object.freeze({ size, modules: Object.freeze(modules) });
  } catch {
    return null;
  }
}

// Gộp các module tối thành một path duy nhất: SVG nhẹ hơn nhiều so với hàng
// nghìn thẻ <rect>, và in ra vẫn sắc nét vì là vector.
export function qrSvgPath(matrix: QrMatrix, quietZone = 4): string {
  const segments: string[] = [];
  for (let row = 0; row < matrix.size; row += 1) {
    let column = 0;
    while (column < matrix.size) {
      if (!matrix.modules[row][column]) {
        column += 1;
        continue;
      }
      let run = 1;
      while (column + run < matrix.size && matrix.modules[row][column + run]) {
        run += 1;
      }
      segments.push(`M${column + quietZone} ${row + quietZone}h${run}v1h-${run}z`);
      column += run;
    }
  }
  return segments.join("");
}

export function qrSvgMarkup(
  matrix: QrMatrix,
  options: QrSvgOptions = {},
): string {
  const quietZone = options.quietZone ?? 4;
  const dark = options.dark ?? "#18213b";
  const light = options.light ?? "#ffffff";
  const extent = matrix.size + quietZone * 2;
  const title = options.title ?? "";
  const titleMarkup = title
    ? `<title>${title.replace(/[<>&"]/g, "")}</title>`
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}"`,
    ` width="${extent * 8}" height="${extent * 8}" shape-rendering="crispEdges"`,
    ` role="img">${titleMarkup}`,
    `<rect width="${extent}" height="${extent}" fill="${light}"/>`,
    `<path fill="${dark}" d="${qrSvgPath(matrix, quietZone)}"/>`,
    "</svg>",
  ].join("");
}

// Data URL để tải xuống bản in. Dùng encodeURIComponent thay vì base64 để
// tránh phụ thuộc `btoa`/`Buffer` giữa Worker, Node và trình duyệt.
export function qrSvgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
