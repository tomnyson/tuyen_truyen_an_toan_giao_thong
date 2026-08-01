// Nguồn env thống nhất cho mọi runtime:
// - Cloudflare Workers (vinext/wrangler): dynamic import "cloudflare:workers"
//   thành công → dùng env bindings thật (tests cũng đi đường này qua
//   registerHooks stub module đó).
// - Node/Vercel (`next build` + serverless): import thất bại → proxy đọc
//   process.env. Không còn import tĩnh nên bước collect-page-data của Next
//   không bao giờ đổ vỡ vì thiếu module.
type WorkerEnv = Record<string, unknown>;

const processEnvProxy: WorkerEnv = new Proxy(
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

let workerEnv: WorkerEnv | null = null;
try {
  // Specifier để trong biến nhằm tránh bundler resolve tĩnh lúc build.
  const specifier = "cloudflare:workers";
  const cloudflareModule = (await import(/* @vite-ignore */ specifier)) as {
    env?: WorkerEnv;
  };
  workerEnv = cloudflareModule.env ?? null;
} catch {
  workerEnv = null;
}

export const env: WorkerEnv = workerEnv ?? processEnvProxy;
