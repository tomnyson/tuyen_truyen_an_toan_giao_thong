import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Luật Học Đường | Tra cứu pháp luật dành cho học sinh",
    description: "Tra cứu nhanh quy định về giao thông, mạng xã hội và sở hữu trí tuệ qua ngôn ngữ dễ hiểu, tình huống gần gũi.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Luật Học Đường",
      description: "Hiểu luật dễ dàng • Ứng xử an toàn",
      images: [{ url: socialImage, width: 1792, height: 1024, alt: "Luật Học Đường" }],
    },
    twitter: { card: "summary_large_image", title: "Luật Học Đường", description: "Hiểu luật dễ dàng • Ứng xử an toàn", images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={beVietnam.variable}>{children}</body>
    </html>
  );
}
