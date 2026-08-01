// Stub thay cho module `cloudflare:workers` khi build bằng Next.js thuần
// (Vercel/Node) — xem alias trong next.config.ts. Trong runtime Node không
// có binding Workers; mọi cấu hình đọc từ process.env. Binding object
// (như DB cũ) không tồn tại — các adapter Neon tự kích hoạt qua
// DATABASE_URL, đúng như đường chạy production hiện tại.
export const env: Record<string, unknown> = new Proxy(
  {},
  {
    get(_target, key) {
      return typeof key === "string" ? process.env[key] : undefined;
    },
    has(_target, key) {
      return typeof key === "string" && key in process.env;
    },
  },
);
