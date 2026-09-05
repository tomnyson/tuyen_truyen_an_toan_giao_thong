// Ảnh/video minh họa dùng chung cho tình huống cảnh báo và kết quả tra cứu
// (US-030). URL luôn đi qua `resolveShowcaseMedia` trước khi tới đây nên chỉ
// còn hai dạng an toàn: ảnh https hoặc embed YouTube no-cookie.
import type { ShowcaseMediaKind } from "@/lib/showcase-media";

export type ContentMediaProps = {
  kind: ShowcaseMediaKind;
  url: string;
  imageAlt: string;
  videoTitle: string;
  className?: string;
};

export function ContentMedia({
  kind,
  url,
  imageAlt,
  videoTitle,
  className = "showcase-media",
}: ContentMediaProps) {
  if (!url) return null;
  if (kind === "image") {
    return (
      <figure className={className} data-media-kind="image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={imageAlt} loading="lazy" width={960} height={540} />
      </figure>
    );
  }
  if (kind === "youtube") {
    return (
      <figure className={className} data-media-kind="youtube">
        <iframe
          src={url}
          title={videoTitle}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
        />
      </figure>
    );
  }
  return null;
}
