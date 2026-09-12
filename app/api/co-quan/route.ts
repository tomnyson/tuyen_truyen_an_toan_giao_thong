// Đầu mối tiếp nhận theo thẩm quyền cho mục trợ giúp pháp lý (US-039).
// Chỉ trả bản `published` — bản nháp không được lộ ra ngoài (DEC-003).

import { eq } from "drizzle-orm";

import { getInitializedDb } from "@/db";
import { referralAuthorities } from "@/db/pg-schema";
import { createAuthorityHandler } from "@/lib/authority-store";

export const GET = createAuthorityHandler(async () => {
  const db = await getInitializedDb();
  return await db
    .select({
      id: referralAuthorities.id,
      name: referralAuthorities.name,
      level: referralAuthorities.level,
      topics: referralAuthorities.topics,
      scope: referralAuthorities.scope,
      address: referralAuthorities.address,
      phone: referralAuthorities.phone,
      hotline: referralAuthorities.hotline,
      note: referralAuthorities.note,
    })
    .from(referralAuthorities)
    .where(eq(referralAuthorities.status, "published"));
});
