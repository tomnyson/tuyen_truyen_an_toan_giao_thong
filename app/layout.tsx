import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { headers } from "next/headers";
import {
  brandDescription,
  brandName,
  brandPageTitle,
  brandTagline,
} from "@/lib/brand";
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
      <body className={beVietnam.variable}>{children}</body>
    </html>
  );
}
