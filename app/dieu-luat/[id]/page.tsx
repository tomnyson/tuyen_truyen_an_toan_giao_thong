// Trang chi tiết điều luật có Open Graph riêng (US-034). Trình thu thập của
// Facebook/Zalo không chạy JavaScript nên nội dung phải được render ở server;
// người dùng bấm vào link chia sẻ cũng thấy ngay đúng điều luật đó.
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
import { loadLawDetail } from "@/lib/content-detail";
import {
  contentMetaDescription,
  contentMetaTitle,
  parseContentRouteId,
  socialImageUrl,
} from "@/lib/content-meta";

type RouteProps = Readonly<{ params: Promise<{ id: string }> }>;

const loadLaw = cache(async (raw: string) => {
  const id = parseContentRouteId(raw);
  return id === null ? null : await loadLawDetail(id);
});

function legalBasisOf(law: { legalBasis: string; citation: unknown }): string {
  const citation = law.citation as {
    documentNumber: string;
    article: string;
    clause: string;
    point: string;
  } | null;
  if (!citation) return law.legalBasis;
  const provision = [
    citation.point ? `Điểm ${citation.point}` : "",
    citation.clause ? `khoản ${citation.clause}` : "",
    citation.article ? `Điều ${citation.article}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${provision} Nghị định ${citation.documentNumber}`.trim();
}

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const law = await loadLaw(id);
  if (!law) return { title: contentMetaTitle("Không tìm thấy nội dung") };

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const image = socialImageUrl(host, requestHeaders.get("x-forwarded-proto"));
  const title = contentMetaTitle(law.title);
  const description = contentMetaDescription([
    legalBasisOf(law),
    law.penalty,
    law.remedy,
  ]);

  return {
    title,
    description,
    alternates: { canonical: contentPath({ type: "law", id: law.id }) },
    openGraph: {
      type: "article",
      title: law.title,
      description,
      images: [{ url: image, width: 1792, height: 1024, alt: law.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: law.title,
      description,
      images: [image],
    },
  };
}

export default async function LawDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const law = await loadLaw(id);
  if (!law) notFound();

  return (
    <ContentDetailLayout kicker="TRA CỨU ĐIỀU LUẬT" topic={law.topic}>
      <h1>{law.title}</h1>
      <ContentMedia
        kind={law.mediaKind}
        url={law.mediaUrl}
        imageAlt={`Ảnh minh họa tình huống: ${law.title}`}
        videoTitle={`Video minh họa tình huống: ${law.title}`}
      />
      <div className="modal-facts">
        <div>
          <span>Căn cứ</span>
          <strong>{legalBasisOf(law)}</strong>
          {law.citation && (
            <a
              href={law.citation.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở nguồn chính thức
            </a>
          )}
        </div>
        <div>
          <span>Mức phạt tham khảo</span>
          <strong>{law.penalty}</strong>
        </div>
      </div>
      <div className="story-box">
        <span>HƯỚNG XỬ LÝ</span>
        <p>{law.remedy}</p>
      </div>
      <div className="story-box">
        <span>TÌNH HUỐNG MINH HỌA</span>
        <p>{law.caseStudy}</p>
      </div>
      {law.tags.length > 0 && (
        <div className="tag-row">
          {law.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      <Link className="modal-ask-ai" href={`/?dieu-luat=${law.id}`}>
        Mở trong trang tra cứu <span aria-hidden="true">→</span>
      </Link>
      <EngagementProvider>
        <EngagementBar entityType="law" entityId={law.id} title={law.title} />
      </EngagementProvider>
      <p className="modal-note">
        Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật.
        Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.
      </p>
    </ContentDetailLayout>
  );
}
