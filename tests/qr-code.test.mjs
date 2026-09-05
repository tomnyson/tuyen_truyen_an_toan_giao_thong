import assert from "node:assert/strict";
import test from "node:test";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  createQrMatrix,
  isQrTargetUrl,
  qrSvgDataUrl,
  qrSvgMarkup,
  qrSvgPath,
} = await import("../lib/qr-code.ts");
const { resolveSiteUrl } = await import("../components/SiteQrCode.tsx");
unregisterTsx();

const siteUrl = "https://tuyentruyenantoangiaothong.example.vn/";

test("chỉ nhận URL http/https tuyệt đối làm nội dung QR", () => {
  assert.equal(isQrTargetUrl(siteUrl), true);
  assert.equal(isQrTargetUrl("http://localhost:3000"), true);
  assert.equal(isQrTargetUrl("javascript:alert(1)"), false);
  assert.equal(isQrTargetUrl("data:text/html,<b>x</b>"), false);
  assert.equal(isQrTargetUrl("/tra-cuu"), false);
  assert.equal(isQrTargetUrl(""), false);
  assert.equal(isQrTargetUrl(`https://a.vn/${"x".repeat(1_000)}`), false);
});

test("ma trận QR vuông, đúng kích thước phiên bản và có finder pattern", () => {
  const matrix = createQrMatrix(siteUrl, "M");
  assert.ok(matrix);
  // Kích thước hợp lệ của QR là 21 + 4n.
  assert.equal((matrix.size - 21) % 4, 0);
  assert.equal(matrix.modules.length, matrix.size);
  for (const row of matrix.modules) assert.equal(row.length, matrix.size);

  // Finder pattern ở ba góc: viền 7x7 tối, vòng trong sáng, lõi 3x3 tối.
  const corners = [
    [0, 0],
    [0, matrix.size - 7],
    [matrix.size - 7, 0],
  ];
  for (const [top, left] of corners) {
    for (let i = 0; i < 7; i += 1) {
      assert.equal(matrix.modules[top][left + i], true);
      assert.equal(matrix.modules[top + 6][left + i], true);
      assert.equal(matrix.modules[top + i][left], true);
      assert.equal(matrix.modules[top + i][left + 6], true);
    }
    assert.equal(matrix.modules[top + 1][left + 1], false);
    assert.equal(matrix.modules[top + 3][left + 3], true);
  }
});

test("URL không hợp lệ trả về null thay vì ném lỗi", () => {
  assert.equal(createQrMatrix("javascript:alert(1)"), null);
  assert.equal(createQrMatrix(""), null);
});

test("mức sửa lỗi cao hơn cần ma trận không nhỏ hơn", () => {
  const low = createQrMatrix(siteUrl, "L");
  const high = createQrMatrix(siteUrl, "H");
  assert.ok(low && high);
  assert.ok(high.size >= low.size);
});

test("path SVG gộp module liền nhau theo hàng và tôn trọng quiet zone", () => {
  const matrix = {
    size: 3,
    modules: [
      [true, true, false],
      [false, true, false],
      [false, false, false],
    ],
  };
  assert.equal(qrSvgPath(matrix, 0), "M0 0h2v1h-2zM1 1h1v1h-1z");
  assert.equal(qrSvgPath(matrix, 4), "M4 4h2v1h-2zM5 5h1v1h-1z");
  assert.equal(qrSvgPath({ size: 1, modules: [[false]] }, 0), "");
});

test("markup SVG có viewBox bao trọn quiet zone và nền sáng", () => {
  const matrix = createQrMatrix(siteUrl, "M");
  const markup = qrSvgMarkup(matrix, { quietZone: 4, title: siteUrl });
  const extent = matrix.size + 8;
  assert.match(markup, new RegExp(`viewBox="0 0 ${extent} ${extent}"`));
  assert.match(markup, /<rect width="\d+" height="\d+" fill="#ffffff"\/>/);
  assert.match(markup, /<path fill="#18213b" d="M/);
  assert.match(markup, /<title>https:\/\/tuyentruyenantoangiaothong/);
});

test("title trong SVG không mang được ký tự đóng thẻ", () => {
  const matrix = createQrMatrix(siteUrl, "M");
  const markup = qrSvgMarkup(matrix, {
    title: '</title><script>alert(1)</script>',
  });
  const title = markup.slice(
    markup.indexOf("<title>") + "<title>".length,
    markup.indexOf("</title>"),
  );
  assert.equal(title, "/titlescriptalert(1)/script");
  assert.ok(!markup.includes("<script"));
});

test("data URL tải xuống là SVG đã encode, mở lại được nguyên văn", () => {
  const matrix = createQrMatrix(siteUrl, "M");
  const markup = qrSvgMarkup(matrix);
  const dataUrl = qrSvgDataUrl(markup);
  assert.ok(dataUrl.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.ok(!dataUrl.includes("<"));
  assert.equal(
    decodeURIComponent(dataUrl.slice("data:image/svg+xml;charset=utf-8,".length)),
    markup,
  );
});

test("site URL ưu tiên cấu hình, sau đó tới origin, và bỏ giá trị rác", () => {
  assert.equal(resolveSiteUrl("https://cau-hinh.vn", "https://origin.vn"), "https://cau-hinh.vn");
  assert.equal(resolveSiteUrl("", "https://origin.vn"), "https://origin.vn");
  assert.equal(resolveSiteUrl("khong-phai-url", "https://origin.vn"), "https://origin.vn");
  assert.equal(resolveSiteUrl("", ""), "");
});
