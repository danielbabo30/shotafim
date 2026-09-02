import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/**
 * שכבת קריאה לבקשות ביקורת (אחרי סיום חוזה). נתונים אמיתיים מ-Prisma,
 * מסונן למשתמש המחובר (ראה CLAUDE.md §"האזור האישי").
 */

export type PendingReviewPrompt = {
  contractId: string;
  campaignTitle: string;
  counterpartyName: string;
};

const DAY = 24 * 60 * 60 * 1000;

const counterpartyNameFor = (contract: {
  providerId: string;
  business: { name: string; userId: string };
  provider: {
    name: string | null;
    creatorProfile: { displayName: string } | null;
    adSpaceOwnerProfile: { companyName: string } | null;
  };
}): string => {
  // viewer יכול להיות המפרסם או הספק — הצד השני הוא מה שמעניין
  return (
    contract.provider.creatorProfile?.displayName ??
    contract.provider.adSpaceOwnerProfile?.companyName ??
    contract.provider.name ??
    "הצד השני"
  );
};

const contractSelect = {
  id: true,
  providerId: true,
  campaign: { select: { title: true } },
  business: { select: { name: true, userId: true } },
  provider: {
    select: {
      name: true,
      creatorProfile: { select: { displayName: true } },
      adSpaceOwnerProfile: { select: { companyName: true } },
    },
  },
} as const;

/**
 * החוזה הכי ישן שבו המשתמש המחובר צריך להשאיר ביקורת — לתצוגת המודאל הגלובלי.
 * תנאים: הצופה צד בחוזה, `completedAt` בטווח 30 הימים האחרונים (cap), אין ביקורת
 * מהמשתמש, ואין `ReviewPrompt` שנדחה לאחרונה (3 ימים) או שנדחה 3 פעמים (cap).
 */
export const getPendingReviewPrompt = cache(async (): Promise<PendingReviewPrompt | null> => {
  const user = await requireActiveUser();
  const now = Date.now();

  const contract = await prisma.contract.findFirst({
    where: {
      completedAt: { not: null, gte: new Date(now - 30 * DAY) },
      OR: [{ business: { userId: user.id } }, { providerId: user.id }],
      reviews: { none: { authorId: user.id } },
      reviewPrompts: {
        none: {
          userId: user.id,
          OR: [{ dismissCount: { gte: 3 } }, { dismissedAt: { gte: new Date(now - 3 * DAY) } }],
        },
      },
    },
    orderBy: { completedAt: "asc" },
    select: contractSelect,
  });
  if (!contract) return null;

  const isProvider = contract.providerId === user.id;
  return {
    contractId: contract.id,
    campaignTitle: contract.campaign.title,
    counterpartyName: isProvider ? contract.business.name : counterpartyNameFor(contract),
  };
});

/**
 * הקשר ל-CTA "השאר ביקורת" בתוך חדר העבודה — בלי ה-cap (אפשר תמיד).
 * מחזיר null אם החוזה לא הושלם / הצופה לא צד / כבר השאיר ביקורת.
 */
export const getContractReviewContext = cache(
  async (contractId: string): Promise<PendingReviewPrompt | null> => {
    const user = await requireActiveUser();

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        completedAt: { not: null },
        OR: [{ business: { userId: user.id } }, { providerId: user.id }],
        reviews: { none: { authorId: user.id } },
      },
      select: contractSelect,
    });
    if (!contract) return null;

    const isProvider = contract.providerId === user.id;
    return {
      contractId: contract.id,
      campaignTitle: contract.campaign.title,
      counterpartyName: isProvider ? contract.business.name : counterpartyNameFor(contract),
    };
  },
);
