import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { getCities } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import { updateAdSpaceAsset } from "@/lib/actions/ad-space-actions";
import { AssetForm } from "@/components/app/ad-spaces/asset-form";
import { AssetActiveToggle } from "@/components/app/ad-spaces/asset-active-toggle";
import { AssetDeleteButton } from "@/components/app/ad-spaces/asset-delete-button";
import { ArrowIcon } from "@/components/marketing/icons";
import type { AdSpaceAssetFormValues } from "@/lib/ad-space-asset-form";

export const metadata: Metadata = { title: "עריכת נכס פרסום" };

const numToStr = (n: number | null | undefined) => (n == null ? "" : String(n));

export default async function EditAdSpaceAssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { id } = await params;
  const { blocked } = await searchParams;
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) redirect("/dashboard");

  const asset = await prisma.adSpaceAsset.findFirst({
    where: { id, owner: { userId: user.id }, deletedAt: null },
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
      cityId: true,
      address: true,
      dimensions: true,
      technicalSpecs: true,
      estimatedReach: true,
      pricingModel: true,
      basePriceILS: true,
      proofRequirement: true,
      images: true,
      isActive: true,
      categories: { select: { categorySlug: true } },
    },
  });
  if (!asset) notFound();

  const [cities, categories] = await Promise.all([
    getCities(),
    getPartnerCategoriesForScope("AD_SPACE"),
  ]);

  const tech = (asset.technicalSpecs ?? {}) as Record<string, unknown>;
  const initial: AdSpaceAssetFormValues = {
    title: asset.title,
    type: asset.type,
    description: asset.description,
    cityId: asset.cityId ?? "",
    address: asset.address ?? "",
    dimensions: asset.dimensions ?? "",
    resolution: typeof tech.resolution === "string" ? tech.resolution : "",
    spotLengthSeconds:
      typeof tech.spotLengthSeconds === "number" ? String(tech.spotLengthSeconds) : "",
    estimatedReach: numToStr(asset.estimatedReach),
    pricingModel: asset.pricingModel,
    basePriceILS: String(Number(asset.basePriceILS)),
    proofRequirement: asset.proofRequirement,
    images: asset.images,
    categories: asset.categories.map((c) => c.categorySlug),
  };

  const action = updateAdSpaceAsset.bind(null, asset.id);

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
        <h1 className="text-on-surface text-2xl font-bold">עריכת נכס פרסום</h1>
        <p className="text-on-surface-variant text-sm leading-relaxed">{asset.title}</p>
      </header>

      <AssetActiveToggle assetId={asset.id} isActive={asset.isActive} />

      <AssetForm
        mode="edit"
        action={action}
        cities={cities}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        initial={initial}
      />

      <AssetDeleteButton assetId={asset.id} blockedByBookings={blocked === "bookings"} />
    </div>
  );
}
