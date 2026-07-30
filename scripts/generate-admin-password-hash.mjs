import { emitKeypressEvents } from "node:readline";
import { createAdminPasswordHash } from "../lib/password-hash.ts";

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Lệnh này cần chạy trong terminal tương tác để không hiển thị mật khẩu.");
  }

  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error) => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Đã hủy."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (character && !key.ctrl && !key.meta) {
        value += character;
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

try {
  const password = await readHidden("Mật khẩu quản trị mới: ");
  if (password.length < 16) {
    throw new Error("Mật khẩu quản trị phải có ít nhất 16 ký tự.");
  }

  const confirmation = await readHidden("Nhập lại mật khẩu: ");
  if (password !== confirmation) {
    throw new Error("Hai lần nhập mật khẩu không khớp.");
  }

  process.stdout.write(`${await createAdminPasswordHash(password)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Không thể tạo password hash."}\n`);
  process.exitCode = 1;
}
