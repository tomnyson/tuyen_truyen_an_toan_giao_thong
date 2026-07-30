interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  readonly __brand?: "D1Database";
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
}

interface D1Result {
  success?: boolean;
  results?: Record<string, unknown>[];
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD_HASH?: string;
    ADMIN_SESSION_SECRET?: string;
    RATE_LIMIT_KEY_SECRET?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    AI_REPHRASE_ENABLED?: string;
    AI_WEB_SEARCH_ENABLED?: string;
    AI_PROVIDER_TIMEOUT_MS?: string;
    AI_PROVIDER_MAX_REQUESTS_PER_MINUTE?: string;
    [key: string]: unknown;
  };
}
