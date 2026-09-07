"use client";

// Thanh tương tác dưới mỗi nội dung: lượt xem (US-033), nút "Nội dung này ý
// nghĩa" và nút chia sẻ (US-034).
import { useEffect, useState, useSyncExternalStore } from "react";
import { contentShareUrl } from "@/lib/deep-link";
import {
  formatEngagementCount,
  type EngagementEntityType,
} from "@/lib/engagement";
import { useEngagement } from "./EngagementProvider";
import { ShareMenu } from "./ShareMenu";
import { resolveSiteUrl } from "./SiteQrCode";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const subscribeToOrigin = () => () => {};
const readOrigin = () => window.location.origin;
const readServerOrigin = () => "";

type EngagementStatProps = Readonly<{
  entityType: EngagementEntityType;
  entityId: number;
}>;

// Số liệu gọn cho thẻ danh sách: chỉ đọc, không gửi request nào.
export function EngagementStat({ entityType, entityId }: EngagementStatProps) {
  const { countOf } = useEngagement();
  const count = countOf(entityType, entityId);
  return (
    <span className="engagement-stat">
      <span className="engagement-metric">
        <span aria-hidden="true">👁</span>
        {formatEngagementCount(count.viewCount)} lượt xem
      </span>
      {count.favoriteCount > 0 && (
        <span className="engagement-metric">
          <span aria-hidden="true">💛</span>
          {formatEngagementCount(count.favoriteCount)} thấy ý nghĩa
        </span>
      )}
    </span>
  );
}

type EngagementBarProps = Readonly<{
  entityType: EngagementEntityType;
  entityId: number;
  title: string;
  // Mở chi tiết nội dung là một lượt xem; đặt false cho nơi chỉ hiển thị nút.
  countView?: boolean;
}>;

export function EngagementBar({
  entityType,
  entityId,
  title,
  countView = true,
}: EngagementBarProps) {
  const { countOf, isFavorite, trackView, toggleFavorite } = useEngagement();
  const [status, setStatus] = useState("");
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    readOrigin,
    readServerOrigin,
  );

  useEffect(() => {
    if (countView) trackView(entityType, entityId);
  }, [countView, entityId, entityType, trackView]);

  const count = countOf(entityType, entityId);
  const favorited = isFavorite(entityType, entityId);

  return (
    <div className="engagement-bar">
      <span className="engagement-metric" data-engagement="views">
        <span aria-hidden="true">👁</span>
        {formatEngagementCount(count.viewCount)} lượt xem
      </span>
      <button
        type="button"
        className="engagement-favorite"
        aria-pressed={favorited}
        onClick={() => {
          void toggleFavorite(entityType, entityId);
        }}
      >
        <span aria-hidden="true">{favorited ? "💛" : "🤍"}</span>
        Nội dung này ý nghĩa
        <span className="engagement-count">
          {formatEngagementCount(count.favoriteCount)}
        </span>
      </button>
      <ShareMenu
        title={title}
        url={contentShareUrl(resolveSiteUrl(configuredSiteUrl, origin), {
          type: entityType,
          id: entityId,
        })}
        onStatus={setStatus}
      />
      <span className="engagement-status" role="status">
        {status}
      </span>
    </div>
  );
}
