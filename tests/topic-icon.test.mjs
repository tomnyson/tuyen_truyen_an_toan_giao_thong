import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("TopicIcon source defines TOPIC_ICON_MAP and POPULAR_TOPIC_ICONS with react-icons", () => {
  const code = readFileSync("components/TopicIcon.tsx", "utf8");
  assert.ok(code.includes("export const TOPIC_ICON_MAP"));
  assert.ok(code.includes("export const POPULAR_TOPIC_ICONS"));

  // Kiểm tra các react-icon chính yếu cho các chuyên đề
  assert.ok(code.includes("FaCapsules")); // Phòng chống ma túy
  assert.ok(code.includes("FaSchool")); // An ninh trật tự trường học
  assert.ok(code.includes("FaGamepad")); // Game & không gian mạng
  assert.ok(code.includes("FaCarSide")); // Giao thông
  assert.ok(code.includes("FaMoneyBillWave")); // Tài chính - tín dụng đen
  assert.ok(code.includes("FaTriangleExclamation")); // Phòng chống tệ nạn xã hội
  assert.ok(code.includes("FaCopyright")); // Sở hữu trí tuệ
});
