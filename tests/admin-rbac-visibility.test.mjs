import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("AdminDashboard hides unauthorized items and respects RBAC visibility", () => {
  const code = readFileSync("app/admin/AdminDashboard.tsx", "utf8");

  // 1. Chỉ admin mới thấy các tab/menu quản trị đặc quyền
  assert.equal(code.includes("isAdmin && ("), true);
  assert.equal(code.includes("sessionActor?.role"), true);

  // 2. Chuyên mục được phân quyền: dropdown chỉ hiển thị accessibleTopics, không show toàn bộ
  assert.equal(code.includes("accessibleTopics.map"), true);

  // 3. Quyền Người xem (Viewer / isReadOnly): ẩn nút chỉnh sửa/xóa và hiển thị thông báo chỉ đọc
  assert.equal(code.includes("!isReadOnly && ("), true);
  assert.equal(code.includes("isReadOnly ? ("), true);
  assert.equal(code.includes("Quyền Người xem (Viewer)"), true);

  // 4. Cảnh báo khi người dùng chưa được cấp bất kỳ chuyên mục nào
  assert.equal(code.includes("accessibleTopics.length === 0 ? ("), true);
  assert.equal(code.includes("Không có chuyên mục"), true);

  // 5. Số liệu trên thẻ điều khiển chỉ đếm nội dung trong phạm vi chuyên mục được cấp phép
  assert.equal(code.includes("visibleLaws.length"), true);
  assert.equal(code.includes("visibleShowcases.length"), true);
});
