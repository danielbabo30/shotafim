import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getBrandContext } from "@/lib/campaigns";
import { CampaignWizard } from "@/components/app/campaign-wizard";

export const metadata: Metadata = { title: "יצירת בריף קמפיין" };

export default async function NewCampaignPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const brand = await getBrandContext();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="text-center">
        <h1 className="text-on-surface text-3xl font-bold">יצירת בריף פרסום חדש</h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          הגדירו את יעד הקמפיין, התוצרים והתקציב — ואז שמרו כטיוטה או פרסמו לקבלת הצעות.
        </p>
      </header>

      {brand ? (
        <CampaignWizard locations={brand.locations} />
      ) : (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל עסקי</h2>
          <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
            כדי ליצור בריף קמפיין יש להשלים את פרופיל העסק (שם, ח.פ, סניפים). מסך הגדרת הפרופיל נמצא
            בבנייה — לאחר שיושלם תוכלו לחזור לכאן.
          </p>
          <Link
            href="/dashboard"
            className="text-primary mt-4 inline-block text-sm font-semibold hover:underline"
          >
            חזרה ללוח הבקרה
          </Link>
        </div>
      )}
    </div>
  );
}
