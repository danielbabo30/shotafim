import "server-only";
import { cache } from "react";
import type { ContractStatus, EscrowStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
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
  notes: string | null;
  status: SubmissionStatus;
  submittedAt: Date;
  feedback: RoomFeedback[];
};

export type ContractRoom = {
  id: string;
  agreementNumber: string;
  status: ContractStatus;
  campaignTitle: string;
  deadline: Date;
  agreedPriceILS: number;
  escrowAmountILS: number;
  escrowStatus: EscrowStatus | null;
  escrowFunded: boolean;
  revisionRoundsUsed: number;
  revisionRoundsMax: number;
  provider: { name: string; image: string | null; handle: string | null };
  submissions: RoomSubmission[];
  conversationId: string | null;
  threadEntries: ThreadEntry[];
};

/** מספר הסכם קריא ויציב מתוך ה-cuid */
const agreementNumber = (id: string): string => `#${id.slice(-4).toUpperCase()}`;

export const getContractRoom = cache(async (id: string): Promise<ContractRoom | null> => {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return null;

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return null;

  const contract = await prisma.contract.findFirst({
    where: { id, businessId: business.id },
    select: {
      id: true,
      status: true,
      deadline: true,
      agreedPriceILS: true,
      revisionRoundsUsed: true,
      revisionRoundsMax: true,
      campaign: { select: { title: true } },
      escrowHold: { select: { amountILS: true, status: true, fundedAt: true } },
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

  return {
    id: contract.id,
    agreementNumber: agreementNumber(contract.id),
    status: contract.status,
    campaignTitle: contract.campaign.title,
    deadline: contract.deadline,
    agreedPriceILS: Number(contract.agreedPriceILS),
    escrowAmountILS: Number(contract.escrowHold?.amountILS ?? contract.agreedPriceILS),
    escrowStatus: contract.escrowHold?.status ?? null,
    escrowFunded: contract.escrowHold?.fundedAt != null,
    revisionRoundsUsed: contract.revisionRoundsUsed,
    revisionRoundsMax: contract.revisionRoundsMax,
    provider: {
      name: creatorProfile?.displayName ?? contract.provider.name ?? "היוצר",
      image: contract.provider.image,
      handle: creatorProfile?.channels[0]?.handle ?? null,
    },
    submissions: contract.submissions.map((s) => ({
      id: s.id,
      version: s.version,
      fileUrl: s.fileUrl,
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

export type BusinessContractListItem = {
  id: string;
  campaignTitle: string;
  providerName: string;
  status: ContractStatus;
  agreedPriceILS: number;
  deadline: Date;
};

export const listBusinessContracts = cache(async (): Promise<BusinessContractListItem[]> => {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return [];

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return [];

  const rows = await prisma.contract.findMany({
    where: { businessId: business.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      agreedPriceILS: true,
      deadline: true,
      campaign: { select: { title: true } },
      provider: {
        select: { name: true, creatorProfile: { select: { displayName: true } } },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    campaignTitle: r.campaign.title,
    providerName: r.provider.creatorProfile?.displayName ?? r.provider.name ?? "היוצר",
    status: r.status,
    agreedPriceILS: Number(r.agreedPriceILS),
    deadline: r.deadline,
  }));
});
