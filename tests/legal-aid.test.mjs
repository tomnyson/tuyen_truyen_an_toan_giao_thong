import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

// ReferralChain.tsx la file .tsx (co JSX) nen dung dung loader tsx/esm/api
// (tu goi register() cua go tsx), khong dung node --experimental-strip-types:
// co che nay khong doc duoc JSX va cung khong resolve duoc import tuong doi
// khong duoi trong lib/*.ts.
const unregisterTsx = register();
const { ReferralChain } = await import("../components/ReferralChain.tsx");
const { buildReferralChain, fallbackReferralAuthorities } = await import(
  "../lib/authority-referral.ts"
);

test.after(async () => {
  await unregisterTsx();
});

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

test("app/page.tsx ngan di sau khi tach bang tro giup", async () => {
  const page = await read("app/page.tsx");
  const lineCount = page.split("\n").length;
  assert.ok(
    lineCount < 990,
    `app/page.tsx phải ngắn hơn 990 dòng sau tác vụ này (hiện ${lineCount})`,
  );
});

// Finding 3+4 cua ban ra soat cuoi GD1: loadChain khong duoc xuat ra ngoai
// component (khong co hook DOM trong repo nay de dung, xem final-fix-brief.md
// muc "Kiem chung bat buoc" #3), nen kiem chung o muc ma nguon dung cau truc
// moi: than loadChain tu bat loi rieng va moi nhanh hong deu roi ve
// fallbackReferralAuthorities kem degraded true, khong con lam mat cau tra
// loi chat da nhan duoc khi rieng /api/co-quan hong.
test("loadChain tu nuot loi va luon fallback ve chuoi co quan khac rong", async () => {
  const consult = await read("components/LegalAidConsult.tsx");

  const loadChainMatch = consult.match(
    /async function loadChain\([\s\S]*?\n  \}\n/,
  );
  assert.ok(loadChainMatch, "khong tim thay than ham loadChain");
  const loadChainBody = loadChainMatch[0];

  // Moi nhanh hong roi ve dung mot fallback duy nhat, xay tu du lieu da duyet.
  assert.match(
    loadChainBody,
    /buildReferralChain\(fallbackReferralAuthorities, topic\)/,
  );
  assert.match(loadChainBody, /degraded:\s*true/);
  // Than ham tu bat loi rieng cua no (fetch nem, JSON hong) — khong de loi
  // thoat ra ngoai lam vo try/catch cua submit() va lam mat cau tra loi chat.
  assert.match(loadChainBody, /\btry\s*{/);
  assert.match(loadChainBody, /\}\s*catch\s*{\s*\n\s*return fallback;/);
  // Chuoi rong hoac khong phai mang cung phai roi ve fallback, khong duoc
  // tra thang [] nhu truoc khi sua.
  assert.match(
    loadChainBody,
    /!Array\.isArray\(payload\.chain\) \|\| payload\.chain\.length === 0/,
  );
  assert.doesNotMatch(loadChainBody, /chain:\s*\[\]/);

  // Cau tra loi chat khong con bi vut khi rieng /api/co-quan hong: khoi catch
  // ngoai cua submit() gio chi con goi lai loadChain(null) truc tiep (khong
  // con .catch() phong thu quanh no vi loadChain da tu an toan), va nhanh
  // thanh cong khong dat lai answer ve null truoc khi cho loadChain.
  assert.doesNotMatch(consult, /loadChain\(null\)\.catch/);
  assert.match(consult, /const referral = await loadChain\(answer\.topic\);/);
});
