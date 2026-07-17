import { desc, eq, sql } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { legalEntries, showcases } from "@/db/schema";
import { hasTrustedOrigin, isAdminRequest } from "@/lib/admin-auth";

type Entity = "law" | "showcase";
const topics = new Set(["Giao thông", "Mạng xã hội", "Sở hữu trí tuệ"]);
const statuses = new Set(["draft", "published"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeCommon(body: Record<string, unknown>) {
  const topic = text(body.topic, 80);
  const status = text(body.status, 20);
  if (!topics.has(topic) || !statuses.has(status)) return null;
  return { topic, status: status as "draft" | "published" };
}

function normalizeLaw(body: Record<string, unknown>) {
  const common = normalizeCommon(body);
  const title = text(body.title, 240);
  const legalBasis = text(body.legalBasis, 500);
  const penalty = text(body.penalty, 500);
  const remedy = text(body.remedy, 1_000);
  const caseStudy = text(body.caseStudy, 2_500);
  if (!common || !title || !legalBasis || !penalty || !remedy || !caseStudy) return null;
  const tags = text(body.tags, 500)
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 12);
  return { ...common, icon: text(body.icon, 8) || "§", title, legalBasis, penalty, remedy, caseStudy, tags: JSON.stringify(tags) };
}

function normalizeShowcase(body: Record<string, unknown>) {
  const common = normalizeCommon(body);
  const title = text(body.title, 240);
  const summary = text(body.summary, 2_500);
  const sourceUrl = text(body.sourceUrl, 1_000);
  if (!common || !title || !summary) return null;
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) return null;
  return { ...common, title, summary, sourceUrl };
}

async function authorize(request: Request, mutation = false) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }
  if (mutation && !hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const db = await getInitializedDb();
  const [laws, caseStudies] = await Promise.all([
    db.select().from(legalEntries).orderBy(desc(legalEntries.updatedAt), desc(legalEntries.id)),
    db.select().from(showcases).orderBy(desc(showcases.updatedAt), desc(showcases.id)),
  ]);
  return Response.json({ laws, showcases: caseStudies });
}

export async function POST(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const entity = body?.entity as Entity | undefined;
  const db = await getInitializedDb();

  if (entity === "law") {
    const values = body && normalizeLaw(body);
    if (!values) return Response.json({ error: "Vui lòng nhập đầy đủ và đúng định dạng." }, { status: 400 });
    const [item] = await db.insert(legalEntries).values(values).returning();
    return Response.json({ item }, { status: 201 });
  }
  if (entity === "showcase") {
    const values = body && normalizeShowcase(body);
    if (!values) return Response.json({ error: "Vui lòng nhập đầy đủ và đúng định dạng." }, { status: 400 });
    const [item] = await db.insert(showcases).values(values).returning();
    return Response.json({ item }, { status: 201 });
  }
  return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const entity = body?.entity as Entity | undefined;
  const id = parseId(body?.id);
  if (!body || !id) return Response.json({ error: "ID không hợp lệ." }, { status: 400 });
  const db = await getInitializedDb();

  if (entity === "law") {
    const values = normalizeLaw(body);
    if (!values) return Response.json({ error: "Vui lòng nhập đầy đủ và đúng định dạng." }, { status: 400 });
    const [item] = await db.update(legalEntries).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(legalEntries.id, id)).returning();
    return item ? Response.json({ item }) : Response.json({ error: "Không tìm thấy nội dung." }, { status: 404 });
  }
  if (entity === "showcase") {
    const values = normalizeShowcase(body);
    if (!values) return Response.json({ error: "Vui lòng nhập đầy đủ và đúng định dạng." }, { status: 400 });
    const [item] = await db.update(showcases).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(showcases.id, id)).returning();
    return item ? Response.json({ item }) : Response.json({ error: "Không tìm thấy nội dung." }, { status: 404 });
  }
  return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const entity = body?.entity as Entity | undefined;
  const id = parseId(body?.id);
  if (!id) return Response.json({ error: "ID không hợp lệ." }, { status: 400 });
  const db = await getInitializedDb();
  if (entity === "law") await db.delete(legalEntries).where(eq(legalEntries.id, id));
  else if (entity === "showcase") await db.delete(showcases).where(eq(showcases.id, id));
  else return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
  return Response.json({ ok: true });
}
