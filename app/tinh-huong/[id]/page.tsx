// Trang chi tiết tình huống cảnh báo có Open Graph riêng (US-034).
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ContentDetailLayout } from "@/components/ContentDetailLayout";
import { ContentMedia } from "@/components/ContentMedia";
import { EngagementBar } from "@/components/EngagementBar";
import { EngagementProvider } from "@/components/EngagementProvider";
import { contentPath } from "@/lib/deep-link";
import { loadShowcaseDetail } from "@/lib/content-detail";
import {
  contentMetaDescription,
  contentMetaTitle,
  parseContentRouteId,
  socialImageUrl,
} from "@/lib/content-meta";

type RouteProps = Readonly<{ params: Promise<{ id: string }> }>;

const loadShowcase = cache(async (raw: string) => {
  const id = parseContentRouteId(raw);
  return id === null ? null : await loadShowcaseDetail(id);
});

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const showcase = await loadShowcase(id);
  if (!showcase) return { title: contentMetaTitle("Không tìm thấy nội dung") };

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const image = socialImageUrl(host, requestHeaders.get("x-forwarded-proto"));
  const description = contentMetaDescription([showcase.summary]);

  return {
    title: contentMetaTitle(showcase.title),
    description,
    alternates: {
      canonical: contentPath({ type: "showcase", id: showcase.id }),
    },
    openGraph: {
      type: "article",
      title: showcase.title,
      description,
      images: [{ url: image, width: 1792, height: 1024, alt: showcase.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: showcase.title,
      description,
      images: [image],
    },
  };
}

export default async function ShowcaseDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const showcase = await loadShowcase(id);
  if (!showcase) notFound();

  return (
    <ContentDetailLayout kicker="GÓC CẢNH BÁO" topic={showcase.topic}>
      <h1>{showcase.title}</h1>
      <ContentMedia
        kind={showcase.mediaKind}
        url={showcase.mediaUrl}
        imageAlt={`Ảnh minh họa tình huống: ${showcase.title}`}
        videoTitle={`Video minh họa tình huống: ${showcase.title}`}
      />
      <div className="story-box">
        <span>TÌNH HUỐNG</span>
        <p>{showcase.summary}</p>
      </div>
      {showcase.sourceUrl && (
        <div className="modal-facts">
          <div>
            <span>Nguồn chính thức</span>
            <a
              href={showcase.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở văn bản gốc
            </a>
          </div>
        </div>
      )}
      <Link className="modal-ask-ai" href={`/?tinh-huong=${showcase.id}`}>
        Mở trong trang tra cứu <span aria-hidden="true">→</span>
      </Link>
      <EngagementProvider>
        <EngagementBar
          entityType="showcase"
          entityId={showcase.id}
          title={showcase.title}
        />
      </EngagementProvider>
      <p className="modal-note">
        Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật.
      </p>
    </ContentDetailLayout>
  );
}
