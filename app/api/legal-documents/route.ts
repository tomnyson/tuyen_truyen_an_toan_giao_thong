import { getInitializedDb } from "@/db";
import { listLegalDocuments, type LegalDocumentFilter } from "@/lib/legal-document-store";

export async function GET(request: Request, context?: { db?: any }) {
  try {
    let db = context?.db ?? null;
    if (!db) {
      try {
        db = await getInitializedDb();
      } catch {
        // Fallback khi DB chua khoi tao
      }
    }

    const url = new URL(request.url);
    const filter: LegalDocumentFilter = {
      query: url.searchParams.get("q") || url.searchParams.get("query") || undefined,
      topic: url.searchParams.get("topic") || undefined,
      documentType: url.searchParams.get("type") || url.searchParams.get("documentType") || undefined,
      authority: url.searchParams.get("authority") || undefined,
      status: "published",
      limit: Number(url.searchParams.get("limit") || 50),
      offset: Number(url.searchParams.get("offset") || 0),
    };

    const documents = await listLegalDocuments(filter, db);

    return Response.json(
      { ok: true, documents },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Lỗi tải danh mục văn bản." },
      { status: 500 }
    );
  }
}
