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
