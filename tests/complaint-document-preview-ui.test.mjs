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
