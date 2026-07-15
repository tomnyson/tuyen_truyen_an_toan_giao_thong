"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/admin/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Không thể đăng nhập.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Kết nối bị gián đoạn. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login">
      <Link className="admin-brand" href="/">
        <span>L</span>
        <strong>LUẬT HỌC ĐƯỜNG</strong>
      </Link>
      <form className="admin-login-card" onSubmit={submit}>
        <p className="admin-kicker">KHU VỰC BIÊN TẬP</p>
        <h1>Đăng nhập quản trị</h1>
        <p>Quản lý nội dung pháp luật và các tình huống cảnh báo.</p>
        <label>
          Tên đăng nhập
          <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          Mật khẩu
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang kiểm tra…" : "Đăng nhập"}</button>
        <small>Phiên đăng nhập tự hết hạn sau 8 giờ.</small>
      </form>
    </main>
  );
}
