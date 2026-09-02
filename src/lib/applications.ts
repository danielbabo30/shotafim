import "server-only";
import { cache } from "react";
import type {
  ApplicationStatus,
  CampaignStatus,
  CampaignTargetType,
  DeliverableType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { TARGET_TYPES_FOR_ROLE } from "@/lib/pitch";

/**
 * שלב 6 — שכבת קריאה לבריפים פתוחים ולהצעות. נתונים אמיתיים מ-Prisma,
 * מסונן למשתמש המחובר (ראה CLAUDE.md §"האזור האישי").
 */

export type ApplicantSummary = {
  userId: string;
  /** CreatorProfile.id ליוצרים (מפתח /dashboard/marketplace/[id]) — null לבעלי שטחים/אחרים */
  profileId: string | null;
  name: string;
  image: string | null;
  kind: "creator" | "space" | "user";
  verified: boolean;
  /** שורת תיאור קצרה — עוקבים / מס' שטחים */
  detail: string | null;
};

export type ApplicationView = {
  id: string;
  applicant: ApplicantSummary;
  proposedPriceILS: number;
  coverLetter: string | null;
  estimatedDeliveryDays: number;
  status: ApplicationStatus;
  createdAt: Date;
  contractId: string | null;
};

export type CampaignBrief = {
  id: string;
  title: string;
  description: string;
  targetType: CampaignTargetType;
  deliverables: DeliverableType[];
  totalBudgetILS: number;
  endDate: Date | null;
  status: CampaignStatus;
  briefAssetsUrl: string | null;
  hasPhysicalProduct: boolean;
  businessName: string;
  locationLabel: string | null;
  createdAt: Date;
};

export type PitchPrefill = {
  proposedPriceILS: number;
  estimatedDeliveryDays: number;
  requestedStartDate: Date | null;
  requestedEndDate: Date | null;
};

export type CampaignDetail = {
  brief: CampaignBrief;
  viewer: "owner" | "provider" | "other";
  /** owner בלבד */
  applications: ApplicationView[];
  /** provider בלבד — ההצעה/הזמנה שלי לבריף הזה */
  myApplication: ApplicationView | null;
  canApply: boolean;
  /** provider בלבד — כשיש הזמנה (INVITED) פתוחה, ערכים למילוי מוקדם של טופס ההגשה */
  invitationPrefill: PitchPrefill | null;
};

const applicantInclude = {
  applicant: {
    select: {
      id: true,
      name: true,
      image: true,
      creatorProfile: {
        select: {
          id: true,
          verificationStatus: true,
          channels: { select: { platform: true, followersCount: true } },
        },
      },
      adSpaceOwnerProfile: {
        select: {
          companyName: true,
          verificationStatus: true,
          _count: { select: { assets: true } },
        },
      },
    },
  },
  contract: { select: { id: true } },
} as const;

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "אינסטגרם",
  TIKTOK: "טיקטוק",
  YOUTUBE: "יוטיוב",
  FACEBOOK: "פייסבוק",
  LINKEDIN: "לינקדאין",
};

function formatFollowers(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

type RawApplicant = {
  id: string;
  name: string | null;
  image: string | null;
  creatorProfile: {
    id: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    channels: { platform: string; followersCount: number }[];
  } | null;
  adSpaceOwnerProfile: {
    companyName: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    _count: { assets: number };
  } | null;
};

function toApplicantSummary(a: RawApplicant): ApplicantSummary {
  if (a.creatorProfile) {
    const top = [...a.creatorProfile.channels].sort(
      (x, y) => y.followersCount - x.followersCount,
    )[0];
    return {
      userId: a.id,
      profileId: a.creatorProfile.id,
      name: a.name ?? "יוצר",
      image: a.image,
      kind: "creator",
      verified: a.creatorProfile.verificationStatus === "VERIFIED",
      detail: top
        ? `${formatFollowers(top.followersCount)} עוקבים ב${PLATFORM_LABEL[top.platform] ?? top.platform}`
        : null,
    };
  }
  if (a.adSpaceOwnerProfile) {
    return {
      userId: a.id,
      profileId: null,
      name: a.adSpaceOwnerProfile.companyName,
      image: a.image,
      kind: "space",
      verified: a.adSpaceOwnerProfile.verificationStatus === "VERIFIED",
      detail: `${a.adSpaceOwnerProfile._count.assets} שטחי פרסום`,
    };
  }
  return {
    userId: a.id,
    profileId: null,
    name: a.name ?? "משתמש",
    image: a.image,
    kind: "user",
    verified: false,
    detail: null,
  };
}

type RawApplication = {
  id: string;
  proposedPriceILS: unknown;
  coverLetter: string | null;
  estimatedDeliveryDays: number;
  status: ApplicationStatus;
  createdAt: Date;
  applicant: RawApplicant;
  contract: { id: string } | null;
};

function toApplicationView(r: RawApplication): ApplicationView {
  return {
    id: r.id,
    applicant: toApplicantSummary(r.applicant),
    proposedPriceILS: Number(r.proposedPriceILS),
    coverLetter: r.coverLetter,
    estimatedDeliveryDays: r.estimatedDeliveryDays,
    status: r.status,
    createdAt: r.createdAt,
    contractId: r.contract?.id ?? null,
  };
}

export const getCampaignDetail = cache(
  async (campaignId: string): Promise<CampaignDetail | null> => {
    const user = await requireActiveUser();

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        description: true,
        targetType: true,
        deliverables: true,
        totalBudgetILS: true,
        endDate: true,
        status: true,
        briefAssetsUrl: true,
        hasPhysicalProduct: true,
        createdAt: true,
        business: { select: { userId: true, name: true } },
        location: { select: { name: true, address: true } },
        applications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            proposedPriceILS: true,
            coverLetter: true,
            estimatedDeliveryDays: true,
            status: true,
            createdAt: true,
            requestedStartDate: true,
            requestedEndDate: true,
            ...applicantInclude,
          },
        },
      },
    });
    if (!campaign) return null;

    const isOwnerEarly = campaign.business.userId === user.id;
    // בריף שאינו פתוח/פעיל גלוי רק לבעליו
    if (!isOwnerEarly && (campaign.status === "DRAFT" || campaign.status === "CANCELLED")) {
      return null;
    }

    const brief: CampaignBrief = {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      targetType: campaign.targetType,
      deliverables: campaign.deliverables,
      totalBudgetILS: Number(campaign.totalBudgetILS),
      endDate: campaign.endDate,
      status: campaign.status,
      briefAssetsUrl: campaign.briefAssetsUrl,
      hasPhysicalProduct: campaign.hasPhysicalProduct,
      businessName: campaign.business.name,
      locationLabel: campaign.location
        ? campaign.location.name
          ? `${campaign.location.name} — ${campaign.location.address}`
          : campaign.location.address
        : null,
      createdAt: campaign.createdAt,
    };

    const isOwner = campaign.business.userId === user.id;
    const allowedTargets: CampaignTargetType[] = [
      ...(user.roleKeys.includes("creator") ? (TARGET_TYPES_FOR_ROLE.CREATOR ?? []) : []),
      ...(user.roleKeys.includes("space") ? (TARGET_TYPES_FOR_ROLE.AD_SPACE_OWNER ?? []) : []),
    ];
    const isProvider = !isOwner && allowedTargets.includes(campaign.targetType);

    const views = campaign.applications.map((a) => toApplicationView(a as RawApplication));
    const mine = views.find((v) => v.applicant.userId === user.id) ?? null;
    const myRaw = campaign.applications.find((a) => a.applicant.id === user.id) ?? null;
    const isInvited = isProvider && mine?.status === "INVITED";
    const isOpen = campaign.status === "OPEN_FOR_PITCHES";

    return {
      brief,
      viewer: isOwner ? "owner" : isProvider ? "provider" : "other",
      applications: isOwner ? views : [],
      myApplication: isProvider ? mine : null,
      // אפשר להגיש כשאין הצעה קיימת, או כשקיימת הזמנה (INVITED) שממתינה למילוי
      canApply: isProvider && isOpen && (!mine || mine.status === "INVITED"),
      invitationPrefill:
        isInvited && myRaw
          ? {
              proposedPriceILS: Number(myRaw.proposedPriceILS),
              estimatedDeliveryDays: myRaw.estimatedDeliveryDays,
              requestedStartDate: myRaw.requestedStartDate,
              requestedEndDate: myRaw.requestedEndDate,
            }
          : null,
    };
  },
);

/** תיבת ההצעות של המפרסם — הצעות שממתינות למענה בכל הקמפיינים שלו */
export const listBrandApplications = cache(async () => {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return [];

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return [];

  const rows = await prisma.campaignApplication.findMany({
    where: { status: "SUBMITTED", campaign: { businessId: business.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      proposedPriceILS: true,
      coverLetter: true,
      estimatedDeliveryDays: true,
      status: true,
      createdAt: true,
      campaign: { select: { id: true, title: true } },
      ...applicantInclude,
    },
  });

  return rows.map((r) => ({
    ...toApplicationView(r as RawApplication),
    campaign: r.campaign,
  }));
});

/** "ההצעות שלי" — לספק (יוצר / בעל שטחים) */
export const listProviderApplications = cache(async () => {
  const user = await requireActiveUser();

  const rows = await prisma.campaignApplication.findMany({
    where: { applicantId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      proposedPriceILS: true,
      estimatedDeliveryDays: true,
      status: true,
      createdAt: true,
      contract: { select: { id: true } },
      campaign: {
        select: { id: true, title: true, status: true, business: { select: { name: true } } },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    proposedPriceILS: Number(r.proposedPriceILS),
    estimatedDeliveryDays: r.estimatedDeliveryDays,
    status: r.status,
    createdAt: r.createdAt,
    contractId: r.contract?.id ?? null,
    campaign: { id: r.campaign.id, title: r.campaign.title, status: r.campaign.status },
    brandName: r.campaign.business.name,
  }));
});

/** בריפים פתוחים שרלוונטיים לספק ושעדיין לא הגיש להם הצעה */
export const listDiscoverCampaigns = cache(async () => {
  const user = await requireActiveUser();

  const allowed: CampaignTargetType[] = [
    ...(user.roleKeys.includes("creator") ? (TARGET_TYPES_FOR_ROLE.CREATOR ?? []) : []),
    ...(user.roleKeys.includes("space") ? (TARGET_TYPES_FOR_ROLE.AD_SPACE_OWNER ?? []) : []),
  ];
  if (allowed.length === 0) return [];

  const rows = await prisma.campaign.findMany({
    where: {
      status: "OPEN_FOR_PITCHES",
      targetType: { in: [...new Set(allowed)] },
      applications: { none: { applicantId: user.id } },
      business: { userId: { not: user.id } }, // לא להציג בריף של עצמך
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      targetType: true,
      deliverables: true,
      totalBudgetILS: true,
      endDate: true,
      createdAt: true,
      business: { select: { name: true } },
      _count: { select: { applications: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    targetType: c.targetType,
    deliverables: c.deliverables,
    totalBudgetILS: Number(c.totalBudgetILS),
    endDate: c.endDate,
    createdAt: c.createdAt,
    brandName: c.business.name,
    applicationCount: c._count.applications,
  }));
});
