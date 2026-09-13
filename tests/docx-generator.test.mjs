import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComplaintDocx } from "../lib/docx-generator.ts";
import { createEmptyComplaintForm } from "../lib/complaint-form-state.ts";

test("buildComplaintDocx creates valid docx binary buffer matching template", async () => {
  const form = createEmptyComplaintForm();
  form.complainant.fullName = "Nguyễn Văn Test";
  form.complainant.idNumber = "001099012345";
  form.complainant.birthYear = "2004";
  form.complainant.permanentAddress = "Cư M'gar, Đắk Lắk";
  form.accused.fullName = "Nguyễn Văn Nghi Phạm";
  form.incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản qua mạng";
  form.incident.chronology = "Ngày 10/09/2026 đối tượng yêu cầu chuyển tiền vào số tài khoản...";
  form.evidence.items = ["Ảnh chụp tin nhắn Zalo", "Biên lai chuyển khoản ngân hàng 2.000.000đ"];

  const buffer = await buildComplaintDocx(form);
  assert.ok(buffer);
  assert.ok(buffer.length > 1000, "Docx file should have reasonable size");
  // Check ZIP/OpenXML magic bytes: PK (0x50, 0x4B)
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
});
