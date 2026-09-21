import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * נתוני מרכז ההודעות של האזור האישי — רשימת שיחות + ה-thread המלא של כל אחת.
 *
 * שליפה אמיתית מ-Prisma: Conversation → participants (מסונן למשתמש המחובר) →
 * הצד השני + הודעות. תבנית ה-thread תואמת את `getContractRoom` ב-src/lib/contracts.ts.
 */

export type ConversationContextKind = "contract" | "campaign" | "application" | "direct";

export type ConversationContext = {
  kind: ConversationContextKind;
  /** תווית ההקשר להצגה — שם הקמפיין / החוזה */
  label: string;
  /** קישור לחדר העבודה של החוזה (רק kind === "contract") */
  workspaceHref?: string;
  /** סכום נעול בנאמנות, ש״ח (רק kind === "contract") */
  escrowAmountILS?: number;
};

export type MessageAttachmentKind = "video" | "image" | "document";

export type MessageAttachment = {
  kind: MessageAttachmentKind;
  /** שם הקובץ — "סקיצה_גרסה_2.mp4" */
  name: string;
  /** שורת מטא — "48MB • וידאו" */
  meta: string;
  href?: string;
};

/** פריט בזרם ה-thread — הודעת מערכת, מפריד תאריך, או הודעה */
export type ThreadEntry =
  | { type: "system"; id: string; text: string }
  | { type: "day"; id: string; label: string }
  | {
      type: "message";
      id: string;
      /** in = הצד השני · out = המשתמש המחובר */
      direction: "in" | "out";
      body?: string;
      attachment?: MessageAttachment;
      /** חותמת שעה מפורמטת — "14:32" */
      time: string;
      /** אישור קריאה — רלוונטי רק ל-direction === "out" */
      read?: boolean;
    };

export type ConversationSummary = {
  id: string;
  /** שם הצד השני */
  name: string;
  /** כינוי משני — "@daniel_foodie" */
  handle?: string;
  avatarUrl?: string;
  online?: boolean;
  context?: ConversationContext;
  /** תצוגה מקדימה של ההודעה האחרונה */
  preview: string;
  /** "14:32" / "אתמול" / "12.05" */
  timeLabel: string;
  unread?: boolean;
  entries: ThreadEntry[];
};

export type MessagesData = {
  conversations: ConversationSummary[];
};

/** מפתחות סינון רשימת השיחות */
export type MessageFilterKey = "all" | "contracts" | "quotes";

const timeFmt = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "היום" / "אתמול" / "12.05" — יחסית להיום */
function dayLabel(d: Date): string {
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  return dateFmt.format(d);
}

/** תווית שעה/יום לשורת התצוגה ברשימת השיחות (כמו וואטסאפ) */
function listTimeLabel(d: Date): string {
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return timeFmt.format(d);
  return dayLabel(d);
}

type OtherUser = {
  name: string | null;
  image: string | null;
  businessProfile: { name: string } | null;
  creatorProfile: { displayName: string; channels: { handle: string }[] } | null;
  adSpaceOwnerProfile: { companyName: string } | null;
};

function displayNameOf(u: OtherUser): string {
  return (
    u.creatorProfile?.displayName ??
    u.adSpaceOwnerProfile?.companyName ??
    u.businessProfile?.name ??
    u.name ??
    "משתמש BridgeAd"
  );
}

export const getMessagesData = cache(async (userId: string): Promise<MessagesData> => {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      campaign: { select: { title: true } },
      contract: {
        select: {
          id: true,
          agreedPriceILS: true,
          platformFeeILS: true,
          campaign: { select: { title: true } },
          escrowHold: { select: { amountILS: true } },
        },
      },
      participants: {
        select: {
          userId: true,
          user: {
            select: {
              name: true,
              image: true,
              businessProfile: { select: { name: true } },
              creatorProfile: {
                select: {
                  displayName: true,
                  channels: {
                    take: 1,
                    orderBy: { followersCount: "desc" },
                    select: { handle: true },
                  },
                },
              },
              adSpaceOwnerProfile: { select: { companyName: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, body: true, readAt: true, createdAt: true },
      },
    },
  });

  const summaries: ConversationSummary[] = conversations.map((conv) => {
    const other = conv.participants.find((p) => p.userId !== userId)?.user ?? null;
    const lastMessage = conv.messages.at(-1) ?? null;
    const lastActivity = lastMessage?.createdAt ?? conv.updatedAt;

    const context: ConversationContext | undefined = conv.contract
      ? {
          kind: "contract",
          label: conv.contract.campaign.title,
          workspaceHref: `/dashboard/contracts/${conv.contract.id}`,
          escrowAmountILS: Number(
            conv.contract.escrowHold?.amountILS ??
              Number(conv.contract.agreedPriceILS) + Number(conv.contract.platformFeeILS),
          ),
        }
      : conv.campaign
        ? { kind: "campaign", label: conv.campaign.title }
        : { kind: "direct", label: "פנייה ישירה" };

    let lastDay = "";
    const entries: ThreadEntry[] = [];
    for (const m of conv.messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) {
        entries.push({ type: "day", id: `day-${m.id}`, label });
        lastDay = label;
      }
      const outgoing = m.senderId === userId;
      entries.push({
        type: "message",
        id: m.id,
        direction: outgoing ? "out" : "in",
        body: m.body,
        time: timeFmt.format(m.createdAt),
        read: outgoing ? m.readAt != null : undefined,
      });
    }

    const unread = conv.messages.some((m) => m.senderId !== userId && m.readAt == null);

    return {
      id: conv.id,
      name: other ? displayNameOf(other) : "משתמש BridgeAd",
      handle: other?.creatorProfile?.channels[0]?.handle,
      avatarUrl: other?.image ?? undefined,
      context,
      preview: lastMessage?.body ?? "אין הודעות עדיין",
      timeLabel: listTimeLabel(lastActivity),
      unread,
      entries,
    };
  });

  return { conversations: summaries };
});
