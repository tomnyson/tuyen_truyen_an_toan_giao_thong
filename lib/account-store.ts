import { desc, eq, sql } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { adminAccounts as adminAccountsTable } from "@/db/pg-schema";
import { hashAdminPassword } from "@/lib/password-hash";

export type AdminAccountRole = "admin" | "editor" | "viewer";
export type AdminAccountStatus = "active" | "disabled";

export type AdminAccountRecord = {
  id: number;
  username: string;
  fullName: string;
  role: AdminAccountRole;
  allowedTopics: string[];
  status: AdminAccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminAccountInput = {
  username: string;
  fullName: string;
  password?: string;
  passwordHash?: string;
  role?: AdminAccountRole;
  allowedTopics?: string[];
  status?: AdminAccountStatus;
};

export type UpdateAdminAccountInput = {
  fullName?: string;
  password?: string;
  passwordHash?: string;
  role?: AdminAccountRole;
  allowedTopics?: string[];
  status?: AdminAccountStatus;
  lastLoginAt?: string;
};

export function canAccessTopic(
  actor: { role?: string; allowedTopics?: readonly string[] | string[] } | null | undefined,
  topic: string,
): boolean {
  if (!actor) return false;
  if (!actor.role || actor.role === "admin") return true;
  const allowed = Array.isArray(actor.allowedTopics) ? actor.allowedTopics : [];
  if (allowed.includes("*")) return true;
  return allowed.includes(topic);
}

function parseJsonTopics(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
}

function mapRowToAccount(row: any): AdminAccountRecord {
  return {
    id: Number(row.id),
    username: String(row.username),
    fullName: String(row.fullName ?? row.full_name ?? ""),
    role: (row.role as AdminAccountRole) || "editor",
    allowedTopics: parseJsonTopics(row.allowedTopics ?? row.allowed_topics),
    status: (row.status as AdminAccountStatus) || "active",
    lastLoginAt: row.lastLoginAt ?? row.last_login_at ?? null,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  };
}

// Fallback in-memory store cho test runner / offline
const fallbackAccounts: Array<AdminAccountRecord & { passwordHash: string }> = [];
let nextAccountId = 1;

export async function listAdminAccounts(dbClient?: any): Promise<AdminAccountRecord[]> {
  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      const rows = await db
        .select()
        .from(adminAccountsTable)
        .orderBy(desc(adminAccountsTable.id));

      if (rows && rows.length > 0) {
        return rows.map(mapRowToAccount);
      }
    } catch {
      // Fallback
    }
  }

  return fallbackAccounts.map(({ passwordHash: _, ...rest }) => rest);
}

export async function getAdminAccountByUsername(
  username: string,
  dbClient?: any,
): Promise<(AdminAccountRecord & { passwordHash: string }) | null> {
  const cleanUsername = username?.trim().toLowerCase();
  if (!cleanUsername) return null;

  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      const rows = await db
        .select()
        .from(adminAccountsTable)
        .where(eq(sql`lower(${adminAccountsTable.username})`, cleanUsername))
        .limit(1);

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          ...mapRowToAccount(row),
          passwordHash: String(row.passwordHash ?? row.password_hash ?? ""),
        };
      }
    } catch {
      // Fallback
    }
  }

  const found = fallbackAccounts.find((a) => a.username.toLowerCase() === cleanUsername);
  return found ? { ...found } : null;
}

export async function createAdminAccount(
  input: CreateAdminAccountInput,
  dbClient?: any,
): Promise<AdminAccountRecord> {
  const username = input.username?.trim();
  if (!username || !/^[a-zA-Z0-9._@-]{3,50}$/.test(username)) {
    throw new Error("Tên đăng nhập không hợp lệ (từ 3-50 ký tự chữ, số hoặc ._@-)");
  }

  const fullName = input.fullName?.trim() || username;
  let passwordHash = input.passwordHash;
  if (!passwordHash) {
    if (!input.password || input.password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }
    passwordHash = await hashAdminPassword(input.password);
  }

  const role = input.role || "editor";
  const allowedTopics = Array.isArray(input.allowedTopics) ? input.allowedTopics : [];
  const status = input.status || "active";
  const now = new Date().toISOString();

  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      const [inserted] = await db
        .insert(adminAccountsTable)
        .values({
          username,
          fullName,
          passwordHash,
          role,
          allowedTopics: JSON.stringify(allowedTopics),
          status,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (inserted) {
        return mapRowToAccount(inserted);
      }
    } catch (err: any) {
      if (err?.message?.includes("unique") || err?.code === "23505") {
        throw new Error("Tên đăng nhập đã tồn tại trong hệ thống");
      }
      // Fallback memory
    }
  }

  const existing = fallbackAccounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error("Tên đăng nhập đã tồn tại trong hệ thống");
  }

  const record: AdminAccountRecord & { passwordHash: string } = {
    id: nextAccountId++,
    username,
    fullName,
    passwordHash,
    role,
    allowedTopics,
    status,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  fallbackAccounts.unshift(record);
  const { passwordHash: _, ...publicRecord } = record;
  return publicRecord;
}

export async function updateAdminAccount(
  id: number,
  input: UpdateAdminAccountInput,
  dbClient?: any,
): Promise<AdminAccountRecord | null> {
  const numericId = Number(id);
  if (!numericId || numericId <= 0) return null;

  const now = new Date().toISOString();
  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  const updateValues: Record<string, any> = {
    updatedAt: now,
  };

  if (input.fullName !== undefined) updateValues.fullName = input.fullName.trim();
  if (input.role !== undefined) updateValues.role = input.role;
  if (input.status !== undefined) updateValues.status = input.status;
  if (input.allowedTopics !== undefined) {
    updateValues.allowedTopics = JSON.stringify(input.allowedTopics);
  }
  if (input.lastLoginAt !== undefined) updateValues.lastLoginAt = input.lastLoginAt;
  if (input.password) {
    updateValues.passwordHash = await hashAdminPassword(input.password);
  } else if (input.passwordHash) {
    updateValues.passwordHash = input.passwordHash;
  }

  if (db) {
    try {
      const [updated] = await db
        .update(adminAccountsTable)
        .set(updateValues)
        .where(eq(adminAccountsTable.id, numericId))
        .returning();

      if (updated) {
        return mapRowToAccount(updated);
      }
    } catch {
      // Fallback
    }
  }

  const index = fallbackAccounts.findIndex((a) => a.id === numericId);
  if (index === -1) return null;

  const current = fallbackAccounts[index];
  const updatedRecord = {
    ...current,
    ...updateValues,
    allowedTopics: input.allowedTopics ?? current.allowedTopics,
    updatedAt: now,
  };
  fallbackAccounts[index] = updatedRecord;
  const { passwordHash: _, ...publicRecord } = updatedRecord;
  return publicRecord;
}

export async function deleteAdminAccount(id: number, dbClient?: any): Promise<boolean> {
  const numericId = Number(id);
  if (!numericId || numericId <= 0) return false;

  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      await db.delete(adminAccountsTable).where(eq(adminAccountsTable.id, numericId));
      return true;
    } catch {
      // Fallback
    }
  }

  const index = fallbackAccounts.findIndex((a) => a.id === numericId);
  if (index !== -1) {
    fallbackAccounts.splice(index, 1);
    return true;
  }
  return false;
}

export async function seedDefaultAdminAccounts(dbClient?: any): Promise<void> {
  const existing = await listAdminAccounts(dbClient);
  if (existing.length === 0) {
    // Tạo 1 tài khoản quản trị viên và 1 biên tập viên mẫu
    await createAdminAccount(
      {
        username: "admin_hethong",
        fullName: "Quản trị viên Hệ thống",
        password: "AdminPassword2026@",
        role: "admin",
        allowedTopics: ["*"],
        status: "active",
      },
      dbClient,
    );

    await createAdminAccount(
      {
        username: "bientap_giaothong",
        fullName: "Ban Biên tập An toàn Giao thông",
        password: "EditorPassword2026@",
        role: "editor",
        allowedTopics: ["Giao thông", "Chuyên đề an ninh trật tự trường học"],
        status: "active",
      },
      dbClient,
    );
  }
}
