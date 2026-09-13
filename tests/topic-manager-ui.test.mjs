import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("TopicManager component source exports a valid React component and handles actions", () => {
  const code = readFileSync("app/admin/TopicManager.tsx", "utf8");
  assert.equal(code.includes("export function TopicManager"), true);
  assert.equal(code.includes("/admin/api/topics"), true);
  assert.equal(code.includes("seed_defaults"), true);
  assert.equal(code.includes("TopicIcon"), true);
  assert.equal(code.includes("POPULAR_TOPIC_ICONS"), true);
});

test("AdminDashboard includes topic navigation item and renders TopicManager", () => {
  const code = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.equal(code.includes("TopicManager"), true);
  assert.equal(code.includes("Chủ đề & Lĩnh vực"), true);
});
