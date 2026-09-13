import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("ComplaintDocumentPreview includes A4 template, national header, and print trigger", () => {
  const content = fs.readFileSync("components/ComplaintDocumentPreview.tsx", "utf8");
  assert.ok(content.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"));
  assert.ok(content.includes("ĐỘC LẬP - TỰ DO - HẠNH PHÚC") || content.includes("Độc lập - Tự do - Hạnh phúc"));
  assert.ok(content.includes("ĐƠN TỐ GIÁC TỘI PHẠM"));
  assert.ok(content.includes("window.print"));
  assert.ok(content.includes("Tải file Word"));
});

test("ComplaintDocumentPreview adheres strictly to Stitch design specifications", () => {
  const content = fs.readFileSync("components/ComplaintDocumentPreview.tsx", "utf8");
  // Date must not be right-aligned
  assert.ok(!content.includes("text-right\">\n              {state.createdDate") && !content.includes("text-right\">\n            {state.createdDate"));
  // Petitioner label must prevent line wrapping
  assert.ok(content.includes("whitespace-nowrap") && content.includes("Tôi tên là (Người làm đơn):"));
  // Exact section header from Stitch
  assert.ok(content.includes("Đối tượng này đã có hành vi vi phạm như sau:"));
  // Evidence upload action matching Stitch
  assert.ok(content.includes("Tải tệp đính kèm ngay"));
  // Signature placeholder matching Stitch
  assert.ok(content.includes("[Chưa ký xác nhận]"));
});

test("Printing isolates A4 legal complaint document and hides all website chrome", () => {
  const pageContent = fs.readFileSync("app/tro-giup-phap-ly/soan-don/page.tsx", "utf8");
  const docContent = fs.readFileSync("components/ComplaintDocumentPreview.tsx", "utf8");
  const cssContent = fs.readFileSync("app/styles/legal-aid.css", "utf8");

  // SiteHeader and SiteFooter must be hidden in print mode on soan-don page
  assert.ok(pageContent.includes("print:hidden") && (
    pageContent.includes("print:hidden\">\n        <SiteHeader") ||
    pageContent.includes("print:hidden\">\n      <SiteHeader") ||
    pageContent.includes("<div className=\"print:hidden\">\n        <SiteHeader")
  ), "SiteHeader must be hidden on print");
  assert.ok(pageContent.includes("<div className=\"print:hidden\">\n        <SiteFooter") ||
            pageContent.includes("<div className=\"print:hidden\">\n      <SiteFooter"),
    "SiteFooter must be hidden on print"
  );

  // In-document interactive button must be hidden in print mode
  assert.ok(docContent.includes("Tải tệp đính kèm ngay") && docContent.includes("print:hidden"), "Document upload button must be print:hidden");

  // CSS must contain standard @media print rules with A4 page format
  assert.ok(cssContent.includes("@media print"), "legal-aid.css must contain @media print");
  assert.ok(cssContent.includes("size: A4 portrait") || cssContent.includes("size: A4"), "Must specify A4 portrait page size");
  assert.ok(cssContent.includes(".site-header") && cssContent.includes(".site-footer"), "CSS must hide site header and footer in print");
});

