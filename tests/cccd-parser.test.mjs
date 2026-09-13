import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCccdQrCode, formatCccdDate } from "../lib/cccd-parser.ts";

test("formatCccdDate converts ddmmyyyy to dd/mm/yyyy", () => {
  assert.equal(formatCccdDate("15052002"), "15/05/2002");
  assert.equal(formatCccdDate("01011999"), "01/01/1999");
  assert.equal(formatCccdDate("invalid"), "");
});

test("parseCccdQrCode correctly parses valid 7-field CCCD QR payload", () => {
  const sample = "001099012345||Nguyễn Văn An|15052002|Nam|Xã Quảng Phú, Huyện Cư M'gar, Đắk Lắk|20042021";
  const result = parseCccdQrCode(sample);
  assert.ok(result);
  assert.equal(result.idNumber, "001099012345");
  assert.equal(result.fullName, "Nguyễn Văn An");
  assert.equal(result.birthDate, "15/05/2002");
  assert.equal(result.birthYear, "2002");
  assert.equal(result.gender, "Nam");
  assert.equal(result.permanentAddress, "Xã Quảng Phú, Huyện Cư M'gar, Đắk Lắk");
  assert.equal(result.issueDate, "20/04/2021");
  assert.equal(result.issuePlace, "Cục Cảnh sát QLHC về TTXH");
});

test("parseCccdQrCode with old CMND field", () => {
  const sample = "040099001122|241234567|Trần Thị Bình|01122004|Nữ|Phường Tân Lập, TP Buôn Ma Thuột, Đắk Lắk|10102022";
  const result = parseCccdQrCode(sample);
  assert.ok(result);
  assert.equal(result.oldIdNumber, "241234567");
  assert.equal(result.fullName, "Trần Thị Bình");
});

test("parseCccdQrCode returns null for malformed or empty text", () => {
  assert.equal(parseCccdQrCode(""), null);
  assert.equal(parseCccdQrCode("invalid|data"), null);
  assert.equal(parseCccdQrCode("123456"), null);
});
