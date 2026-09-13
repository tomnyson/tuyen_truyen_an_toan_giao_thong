import { getActiveTopicDefinitions } from "@/lib/topic-store";
import { getInitializedDb } from "@/db";

export async function GET() {
  try {
    let db = null;
    try {
      db = await getInitializedDb();
    } catch {
      // Fallback khi DB chua khoi tao
    }
    const topics = await getActiveTopicDefinitions(db);
    return Response.json(
      { topics },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Lỗi tải chủ đề." },
      { status: 500 }
    );
  }
}
