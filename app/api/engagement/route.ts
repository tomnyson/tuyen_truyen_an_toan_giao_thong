import { getInitializedDb } from "@/db";
import { parseEngagementRequest } from "@/lib/engagement";
import {
  applyEngagement,
  pruneEngagementMarks,
  readEngagementCounts,
} from "@/lib/engagement-store";

const noStore = { "Cache-Control": "no-store" } as const;

// Xác suất dọn dấu hết hạn cho mỗi lượt ghi — đủ thường xuyên để bảng không
// phình, đủ hiếm để không thêm chi phí cho phần lớn request.
const pruneProbability = 0.02;

export async function GET() {
  try {
    const db = await getInitializedDb();
    const counts = await readEngagementCounts(db);
    return Response.json({ counts }, { headers: noStore });
  } catch {
    return Response.json(
      { error: "ENGAGEMENT_DEPENDENCY_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseEngagementRequest(body);
  if (!parsed) {
    return Response.json(
      { error: "ENGAGEMENT_REQUEST_INVALID" },
      { status: 400, headers: noStore },
    );
  }
  try {
    const db = await getInitializedDb();
    const result = await applyEngagement(db, parsed, Date.now());
    if (Math.random() < pruneProbability) {
      await pruneEngagementMarks(db, Date.now()).catch(() => undefined);
    }
    return Response.json(
      { count: result.count, counted: result.counted },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      { error: "ENGAGEMENT_DEPENDENCY_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}
