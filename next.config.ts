import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// `cloudflare:workers` chỉ tồn tại trong runtime Workers (vinext/wrangler).
// Khi build bằng Next thuần (Vercel chạy `next build`), alias nó sang stub
// đọc process.env để bước collect-page-data không đổ vỡ.
const workerEnvStub = fileURLToPath(
  new URL("./lib/worker-env-stub.ts", import.meta.url),
);

// vinext cũng đọc next.config — không được đè alias khi build/dev bằng
// vinext (plugin Cloudflare tự xử lý cloudflare:workers). Các script vinext
// trong package.json đều đặt WRANGLER_LOG_PATH nên dùng nó làm tín hiệu.
const isVinext = Boolean(process.env.WRANGLER_LOG_PATH);

const nextConfig: NextConfig = {
  ...(isVinext
    ? {}
    : {
        turbopack: {
          resolveAlias: {
            "cloudflare:workers": "./lib/worker-env-stub.ts",
          },
        },
        webpack: (config: {
          resolve?: { alias?: Record<string, string> };
        }) => {
          config.resolve ??= {};
          config.resolve.alias ??= {};
          config.resolve.alias["cloudflare:workers"] = workerEnvStub;
          return config;
        },
      }),
};

export default nextConfig;
