interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  readonly __brand?: "D1Database";
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

interface D1PreparedStatement {
  run(): Promise<unknown>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_SESSION_SECRET?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    AI_REPHRASE_ENABLED?: string;
    AI_WEB_SEARCH_ENABLED?: string;
    AI_PROVIDER_TIMEOUT_MS?: string;
    AI_PROVIDER_MAX_REQUESTS_PER_MINUTE?: string;
    [key: string]: unknown;
  };
}
