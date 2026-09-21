import "server-only";
import { cache } from "react";
import type { ContractStatus, EscrowStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractParty } from "@/lib/contract-room";
import type { ThreadEntry } from "@/lib/messages";

const time = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

export type RoomFeedback = {
  id: string;
  timestampSeconds: number | null;
  feedbackText: string;
  isResolved: boolean;
  authorName: string | null;
  createdAt: Date;
};

export type RoomSubmission = {
  id: string;
  version: number;
  fileUrl: string;
  /** mime של קובץ שהועלה — null לקישור חיצוני */
  mimeType: string | null;
  fileName: string | null;
  notes: string | null;
  status: SubmissionStatus;
  submittedAt: Date;
  feedback: RoomFeedback[];
};

export type ContractShippingView = {
  recipientName: string;
  phone: string;
  address: string;
  cityId: string | null;
  cityLabel: string | null;
  notes: string | null;
  updatedAt: Date;
};

export type ContractRoom = {
  id: string;
  agreementNumber: string;
  status: ContractStatus;
  /** מי מהצדדים צופה — קובע אילו פעולות מוצגות */
  viewerParty: ContractParty;
  campaignTitle: string;
  deadline: Date;
  agreedPriceILS: number;
  platformFeeILS: number;
  escrowAmountILS: number;
  escrowStatus: EscrowStatus | null;
  escrowFunded: boolean;
  revisionRoundsUsed: number;
  revisionRoundsMax: number;
  /** הקמפיין כולל מוצר פיזי שיש לשלוח ליוצר */
  hasPhysicalProduct: boolean;
  /** פרטי המשלוח שהיוצר עדכן — null עד שהוזנו */
  shipping: ContractShippingView | null;
  /** הצד השני בחדר (יוצר/בעל שטח למפרסם, המפרסם לספק) */
  counterparty: { name: string; image: string | null; handle: string | null };
  submissions: RoomSubmission[];
  conversationId: string | null;
  threadEntries: ThreadEntry[];
};

/** מספר הסכם קריא ויציב מתוך ה-cuid */
const agreementNumber = (id: string): string => `#${id.slice(-4).toUpperCase()}`;

export const getContractRoom = cache(async (id: string): Promise<ContractRoom | null> => {
  const user = await requireActiveUser();

  const contract = await prisma.contract.findFirst({
    where: {
      id,
      OR: [{ business: { userId: user.id } }, { providerId: user.id }],
    },
    select: {
      id: true,
      status: true,
      deadline: true,
      agreedPriceILS: true,
      platformFeeILS: true,
      providerId: true,
      campaignId: true,
      revisionRoundsUsed: true,
      revisionRoundsMax: true,
      campaign: { select: { title: true, hasPhysicalProduct: true } },
      shipping: {
        select: {
          recipientName: true,
          phone: true,
          address: true,
          cityId: true,
          notes: true,
          updatedAt: true,
          city: { select: { nameHe: true } },
        },
      },
      escrowHold: { select: { amountILS: true, status: true, fundedAt: true } },
      business: { select: { name: true, user: { select: { name: true, image: true } } } },
      provider: {
        select: {
          name: true,
          image: true,
          creatorProfile: {
            select: {
              displayName: true,
              channels: { take: 1, orderBy: { followersCount: "desc" }, select: { handle: true } },
            },
          },
          adSpaceOwnerProfile: { select: { companyName: true } },
        },
      },
      submissions: {
        orderBy: { version: "asc" },
        select: {
          id: true,
          version: true,
          fileUrl: true,
          notes: true,
          status: true,
          submittedAt: true,
          mediaAttachment: { select: { mimeType: true, originalFilename: true } },
          feedback: {
            orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              timestampSeconds: true,
              feedbackText: true,
              isResolved: true,
              createdAt: true,
              author: { select: { name: true } },
            },
          },
        },
      },
      conversations: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, senderId: true, body: true, readAt: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!contract) return null;

  const viewerParty: ContractParty = contract.providerId === user.id ? "provider" : "brand";
  const conversation = contract.conversations[0] ?? null;

  const threadEntries: ThreadEntry[] = [
    {
      type: "system",
      id: "sys-agreement",
      text: `השיחה מאובטחת ומגובה בהסכם עבודה ${agreementNumber(contract.id)}`,
    },
    ...(conversation?.messages ?? []).map((m): ThreadEntry => {
      const outgoing = m.senderId === user.id;
      return {
        type: "message",
        id: m.id,
        direction: outgoing ? "out" : "in",
        body: m.body,
        time: time.format(m.createdAt),
        read: outgoing ? m.readAt != null : undefined,
      };
    }),
  ];

  const creatorProfile = contract.provider.creatorProfile;
  const providerName =
    creatorProfile?.displayName ??
    contract.provider.adSpaceOwnerProfile?.companyName ??
    contract.provider.name ??
    "הספק";

  const counterparty =
    viewerParty === "brand"
      ? {
          name: providerName,
          image: contract.provider.image,
          handle: creatorProfile?.channels[0]?.handle ?? null,
        }
      : {
          name: contract.business.name,
          image: contract.business.user.image,
          handle: null,
        };

  return {
    id: contract.id,
    agreementNumber: agreementNumber(contract.id),
    status: contract.status,
    viewerParty,
    campaignTitle: contract.campaign.title,
    deadline: contract.deadline,
    agreedPriceILS: Number(contract.agreedPriceILS),
    platformFeeILS: Number(contract.platformFeeILS),
    escrowAmountILS: Number(
      contract.escrowHold?.amountILS ??
        Number(contract.agreedPriceILS) + Number(contract.platformFeeILS),
    ),
    escrowStatus: contract.escrowHold?.status ?? null,
    escrowFunded: contract.escrowHold?.fundedAt != null,
    revisionRoundsUsed: contract.revisionRoundsUsed,
    revisionRoundsMax: contract.revisionRoundsMax,
    hasPhysicalProduct: contract.campaign.hasPhysicalProduct,
    shipping: contract.shipping
      ? {
          recipientName: contract.shipping.recipientName,
          phone: contract.shipping.phone,
          address: contract.shipping.address,
          cityId: contract.shipping.cityId,
          cityLabel: contract.shipping.city?.nameHe ?? null,
          notes: contract.shipping.notes,
          updatedAt: contract.shipping.updatedAt,
        }
      : null,
    counterparty,
    submissions: contract.submissions.map((s) => ({
      id: s.id,
      version: s.version,
      fileUrl: s.fileUrl,
      mimeType: s.mediaAttachment?.mimeType ?? null,
      fileName: s.mediaAttachment?.originalFilename ?? null,
      notes: s.notes,
      status: s.status,
      submittedAt: s.submittedAt,
      feedback: s.feedback.map((f) => ({
        id: f.id,
        timestampSeconds: f.timestampSeconds,
        feedbackText: f.feedbackText,
        isResolved: f.isResolved,
        authorName: f.author.name,
        createdAt: f.createdAt,
      })),
    })),
    conversationId: conversation?.id ?? null,
    threadEntries,
  };
});

export type ContractListItem = {
  id: string;
  campaignTitle: string;
  counterpartyName: string;
  party: ContractParty;
  status: ContractStatus;
  agreedPriceILS: number;
  deadline: Date;
};

/** כל החוזים שהמשתמש המחובר צד בהם — כמפרסם או כספק */
export const listContracts = cache(async (): Promise<ContractListItem[]> => {
  const user = await requireActiveUser();

  const rows = await prisma.contract.findMany({
    where: { OR: [{ business: { userId: user.id } }, { providerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      agreedPriceILS: true,
      deadline: true,
      providerId: true,
      campaign: { select: { title: true } },
      business: { select: { name: true } },
      provider: {
        select: {
          name: true,
          creatorProfile: { select: { displayName: true } },
          adSpaceOwnerProfile: { select: { companyName: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const party: ContractParty = r.providerId === user.id ? "provider" : "brand";
    const providerName =
      r.provider.creatorProfile?.displayName ??
      r.provider.adSpaceOwnerProfile?.companyName ??
      r.provider.name ??
      "הספק";
    return {
      id: r.id,
      campaignTitle: r.campaign.title,
      counterpartyName: party === "brand" ? providerName : r.business.name,
      party,
      status: r.status,
      agreedPriceILS: Number(r.agreedPriceILS),
      deadline: r.deadline,
    };
  });
});
