import "server-only";
import { cache } from "react";
import type { LegalEntityType, BusinessModel, CreatorTaxStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSocialConnections, type SocialConnectionVM } from "@/lib/social-connections";

export type { SocialConnectionVM } from "@/lib/social-connections";

/**
 * שכבת קריאה למסך ההגדרות (/dashboard/settings) — כל הנתונים מגיעים מ-Prisma,
 * מסוננים תמיד ל-userId המחובר. cache() מבטל כפילויות באותה בקשה (CLAUDE.md §"האזור האישי").
 *
 * תוויות התצוגה (LEGAL_ENTITY_TYPE_LABELS וכו') עברו ל-src/lib/settings-labels.ts —
 * קובץ ללא server-only, כי קומפוננטות client (טפסים) צריכות לייבא אותן ישירות.
 */
export {
  LEGAL_ENTITY_TYPE_LABELS,
  BUSINESS_MODEL_LABELS,
  CREATOR_TAX_STATUS_LABELS,
} from "@/lib/settings-labels";

export type AccountSettings = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type BankDetails = {
  bank: string;
  branch: string;
  account: string;
  accountHolder: string;
};

export type SocialLinks = {
  instagram: string;
  tiktok: string;
  facebook: string;
};

export type BrandSettings = {
  id: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  socialLinks: SocialLinks;
  logoUrl: string | null;
  contactName: string;
  contactPhone: string;
  billingEmail: string;
  billingAddress: string;
  categorySlugs: string[];
  // תצוגה בלבד
  legalName: string | null;
  companyId: string;
  entityType: LegalEntityType;
  businessModel: BusinessModel;
};

export type CreatorChannelVM = {
  id: string;
  platform: string;
  handle: string;
  channelUrl: string;
  followersCount: number;
  avgViews: number | null;
  engagementRate: number | null;
  isChannelVerified: boolean;
  lastSyncedAt: Date | null;
  /** לא-null רק כשהערוץ חובר דרך OAuth אמיתי (כרגע: יוטיוב) — קובע האם עריכה ידנית מותרת */
  oauthTokenUpdatedAt: Date | null;
};

export type CreatorPricingPackageVM = {
  id: string;
  deliverableType: string;
  title: string;
  priceILS: number;
  turnaroundDays: number;
  revisionsIncluded: number;
  isActive: boolean;
  hasDependents: boolean;
};

export type CreatorSettings = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  primaryCityId: string | null;
  payoutBankDetails: BankDetails;
  billingAddress: string | null;
  categorySlugs: string[];
  channels: CreatorChannelVM[];
  socialConnections: SocialConnectionVM[];
  pricingPackages: CreatorPricingPackageVM[];
  // תצוגה בלבד
  legalFullName: string;
  idNumber: string;
  taxStatus: CreatorTaxStatus;
};

export type AdSpaceOwnerSettings = {
  id: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  billingEmail: string;
  billingAddress: string;
  payoutBankDetails: BankDetails;
  // תצוגה בלבד
  legalName: string;
  companyId: string;
  entityType: LegalEntityType;
};

export type SettingsData = {
  account: AccountSettings;
  brand: BrandSettings | null;
  creator: CreatorSettings | null;
  adSpaceOwner: AdSpaceOwnerSettings | null;
};

const emptyBank: BankDetails = { bank: "", branch: "", account: "", accountHolder: "" };
const emptySocial: SocialLinks = { instagram: "", tiktok: "", facebook: "" };

function readBank(json: unknown): BankDetails {
  if (!json || typeof json !== "object") return { ...emptyBank };
  const j = json as Record<string, unknown>;
  return {
    bank: typeof j.bank === "string" ? j.bank : "",
    branch: typeof j.branch === "string" ? j.branch : "",
    account: typeof j.account === "string" ? j.account : "",
    accountHolder: typeof j.accountHolder === "string" ? j.accountHolder : "",
  };
}

function readSocial(json: unknown): SocialLinks {
  if (!json || typeof json !== "object") return { ...emptySocial };
  const j = json as Record<string, unknown>;
  return {
    instagram: typeof j.instagram === "string" ? j.instagram : "",
    tiktok: typeof j.tiktok === "string" ? j.tiktok : "",
    facebook: typeof j.facebook === "string" ? j.facebook : "",
  };
}

/** כל נתוני מסך ההגדרות עבור המשתמש המחובר — פרופיל אחד לכל תפקיד שיש לו. */
export const getSettingsData = cache(async (userId: string): Promise<SettingsData> => {
  const [user, businessProfile, creatorProfile, adSpaceOwnerProfile] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.businessProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        websiteUrl: true,
        socialLinks: true,
        logoUrl: true,
        contactName: true,
        contactPhone: true,
        billingEmail: true,
        billingAddress: true,
        legalName: true,
        companyId: true,
        entityType: true,
        businessModel: true,
        categories: { select: { categorySlug: true } },
      },
    }),
    prisma.creatorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverImageUrl: true,
        primaryCityId: true,
        payoutBankDetails: true,
        billingAddress: true,
        legalFullName: true,
        idNumber: true,
        taxStatus: true,
        categories: { select: { categorySlug: true } },
        channels: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            platform: true,
            handle: true,
            channelUrl: true,
            followersCount: true,
            avgViews: true,
            engagementRate: true,
            isChannelVerified: true,
            lastSyncedAt: true,
            oauthTokenUpdatedAt: true,
          },
        },
        socialConsents: { select: { platform: true, consentedAt: true } },
        pricingPackages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            deliverableType: true,
            title: true,
            priceILS: true,
            turnaroundDays: true,
            revisionsIncluded: true,
            isActive: true,
            _count: { select: { applications: true, contracts: true } },
          },
        },
      },
    }),
    prisma.adSpaceOwnerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        contactPhone: true,
        billingEmail: true,
        billingAddress: true,
        payoutBankDetails: true,
        legalName: true,
        companyId: true,
        entityType: true,
      },
    }),
  ]);

  return {
    account: { id: user.id, name: user.name, phone: user.phone, email: user.email },
    brand: businessProfile
      ? {
          id: businessProfile.id,
          name: businessProfile.name,
          description: businessProfile.description,
          websiteUrl: businessProfile.websiteUrl,
          socialLinks: readSocial(businessProfile.socialLinks),
          logoUrl: businessProfile.logoUrl,
          contactName: businessProfile.contactName,
          contactPhone: businessProfile.contactPhone,
          billingEmail: businessProfile.billingEmail,
          billingAddress: businessProfile.billingAddress,
          categorySlugs: businessProfile.categories.map((c) => c.categorySlug),
          legalName: businessProfile.legalName,
          companyId: businessProfile.companyId,
          entityType: businessProfile.entityType,
          businessModel: businessProfile.businessModel,
        }
      : null,
    creator: creatorProfile
      ? {
          id: creatorProfile.id,
          displayName: creatorProfile.displayName,
          bio: creatorProfile.bio,
          avatarUrl: creatorProfile.avatarUrl,
          coverImageUrl: creatorProfile.coverImageUrl,
          primaryCityId: creatorProfile.primaryCityId,
          payoutBankDetails: readBank(creatorProfile.payoutBankDetails),
          billingAddress: creatorProfile.billingAddress,
          categorySlugs: creatorProfile.categories.map((c) => c.categorySlug),
          legalFullName: creatorProfile.legalFullName,
          idNumber: creatorProfile.idNumber,
          taxStatus: creatorProfile.taxStatus,
          channels: creatorProfile.channels.map((c) => ({
            id: c.id,
            platform: c.platform,
            handle: c.handle,
            channelUrl: c.channelUrl,
            followersCount: c.followersCount,
            avgViews: c.avgViews,
            engagementRate: c.engagementRate,
            isChannelVerified: c.isChannelVerified,
            lastSyncedAt: c.lastSyncedAt,
            oauthTokenUpdatedAt: c.oauthTokenUpdatedAt,
          })),
          socialConnections: buildSocialConnections(
            creatorProfile.channels,
            creatorProfile.socialConsents,
          ),
          pricingPackages: creatorProfile.pricingPackages.map((p) => ({
            id: p.id,
            deliverableType: p.deliverableType,
            title: p.title,
            priceILS: Number(p.priceILS),
            turnaroundDays: p.turnaroundDays,
            revisionsIncluded: p.revisionsIncluded,
            isActive: p.isActive,
            hasDependents: p._count.applications > 0 || p._count.contracts > 0,
          })),
        }
      : null,
    adSpaceOwner: adSpaceOwnerProfile
      ? {
          id: adSpaceOwnerProfile.id,
          companyName: adSpaceOwnerProfile.companyName,
          contactName: adSpaceOwnerProfile.contactName,
          contactPhone: adSpaceOwnerProfile.contactPhone,
          billingEmail: adSpaceOwnerProfile.billingEmail,
          billingAddress: adSpaceOwnerProfile.billingAddress,
          payoutBankDetails: readBank(adSpaceOwnerProfile.payoutBankDetails),
          legalName: adSpaceOwnerProfile.legalName,
          companyId: adSpaceOwnerProfile.companyId,
          entityType: adSpaceOwnerProfile.entityType,
        }
      : null,
  };
});
