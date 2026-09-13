import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CccdQrScanner exports valid component and does not upload images to server", () => {
  const content = fs.readFileSync("components/CccdQrScanner.tsx", "utf8");
  assert.ok(content.includes("export default function CccdQrScanner") || content.includes("export function CccdQrScanner"));
  assert.ok(content.includes("jsQR") || content.includes("BarcodeDetector"));
  assert.ok(content.includes("parseCccdQrCode"));
  // Assert privacy requirement: NO fetch or XMLHttpRequest uploading image data
  assert.ok(!content.includes("fetch("), "CccdQrScanner must not make network requests");
  assert.ok(!content.includes("FormData"), "CccdQrScanner must not construct FormData for upload");
});

test("CccdQrScanner supports live camera scanning via getUserMedia with local stream cleanup", () => {
  const content = fs.readFileSync("components/CccdQrScanner.tsx", "utf8");
  assert.ok(content.includes("getUserMedia"), "Must request camera via getUserMedia");
  assert.ok(content.includes("<video"), "Must render video stream for live camera");
  assert.ok(content.includes("getTracks"), "Must stop tracks to release camera hardware on close/cleanup");
  assert.ok(content.includes("facingMode"), "Must specify camera facingMode for mobile devices");
});

