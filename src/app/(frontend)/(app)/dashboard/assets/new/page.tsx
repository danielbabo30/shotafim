import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { getCities } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import { createAdSpaceAsset } from "@/lib/actions/ad-space-actions";
import { AssetForm } from "@/components/app/ad-spaces/asset-form";
import { ArrowIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "הוספת נכס פרסום" };

export default async function NewAdSpaceAssetPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) redirect("/dashboard");

  const [owner, cities, categories] = await Promise.all([
    prisma.adSpaceOwnerProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    getCities(),
    getPartnerCategoriesForScope("AD_SPACE"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/dashboard/assets"
          className="text-on-surface-variant hover:text-primary inline-flex w-fit items-center gap-1 text-xs font-medium transition-colors"
        >
          <ArrowIcon className="size-3.5" />
          שטחי הפרסום שלי
        </Link>
        <h1 className="text-on-surface text-2xl font-bold">הוספת נכס פרסום חדש</h1>
        <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed">
          הגדירו מיקום, מפרט ותמחור. אחרי השמירה הנכס יופיע בקטלוג ומפרסמים יוכלו לשריין אותו ביומן.
        </p>
      </header>

      {!owner ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל בעל שטחים</h2>
          <p className="text-on-surface-variant mt-2 max-w-lg text-sm leading-relaxed">
            הוספת נכסי מדיה נפתחת לאחר השלמת פרופיל בעל השטחים ואימותו. מסך ההגדרה בבנייה.
          </p>
        </div>
      ) : (
        <AssetForm
          mode="create"
          action={createAdSpaceAsset}
          cities={cities}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      )}
    </div>
  );
}
