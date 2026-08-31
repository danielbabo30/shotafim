import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { ROLE_META } from "@/lib/app-nav";
import { BrandDashboard } from "@/components/app/dashboard/brand-dashboard";
import { DashboardHeader } from "@/components/app/dashboard/dashboard-header";

export const metadata: Metadata = { title: "לוח בקרה" };

export default async function DashboardPage() {
  const user = await requireActiveUser();

  if (user.activeRole === "brand") {
    return <BrandDashboard user={user} />;
  }

  // שאר הכובעים (יוצר / בעל שטחים / ניהול) — לוחות ייעודיים ייבנו בשלבים הבאים.
  const role = ROLE_META[user.activeRole];
  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader name={user.name} subtitle={`${role.emoji} ${role.label}`} />
      <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-8 text-sm leading-relaxed">
        לוח הבקרה של «{role.label}» בבנייה. בינתיים אפשר לנווט מהתפריט הצדדי.
      </div>
    </div>
  );
}
