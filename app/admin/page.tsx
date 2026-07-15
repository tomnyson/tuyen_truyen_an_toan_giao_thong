import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import { adminCookieName, verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = await verifyAdminSession(cookieStore.get(adminCookieName)?.value);
  if (!isAuthenticated) redirect("/admin/login");
  return <AdminDashboard />;
}
