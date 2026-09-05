import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import "./admin.css";

export const metadata: Metadata = {
  title: `Quản trị | ${brandName}`,
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
