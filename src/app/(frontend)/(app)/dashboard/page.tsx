import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { BrandDashboard } from "@/components/app/dashboard/brand-dashboard";
import { SpaceDashboard } from "@/components/app/dashboard/space/space-dashboard";
import { CreatorDashboard } from "@/components/app/dashboard/creator/creator-dashboard";
import { AdminDashboard } from "@/components/app/dashboard/admin/admin-dashboard";

export const metadata: Metadata = { title: "לוח בקרה" };

export default async function DashboardPage() {
  const user = await requireActiveUser();

  if (user.activeRole === "brand") {
    return <BrandDashboard user={user} />;
  }

  if (user.activeRole === "space") {
    return <SpaceDashboard user={user} />;
  }

  if (user.activeRole === "creator") {
    return <CreatorDashboard />;
  }

  return <AdminDashboard user={user} />;
}
