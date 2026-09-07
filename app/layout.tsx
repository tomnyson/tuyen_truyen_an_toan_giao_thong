import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { headers } from "next/headers";
import {
  brandDescription,
  brandName,
  brandPageTitle,
  brandTagline,
} from "@/lib/brand";
import "./globals.css";

// Chữ nội dung theo bản thiết kế `design/index.html`: Nunito cho toàn bộ phần
// thân, Baloo 2 cho tiêu đề.
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

// Chữ tiêu đề bo tròn theo bản thiết kế; Baloo 2 có bộ dấu tiếng Việt đầy đủ.
const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: brandPageTitle,
    description: brandDescription,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: brandName,
      description: brandTagline,
      images: [{ url: socialImage, width: 1792, height: 1024, alt: brandName }],
    },
    twitter: { card: "summary_large_image", title: brandName, description: brandTagline, images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${nunito.variable} ${baloo.variable}`}>{children}</body>
    </html>
  );
}
