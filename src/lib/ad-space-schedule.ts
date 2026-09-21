import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MEDIA_TYPE_LABELS, TYPE_TO_MEDIA, type AdSpaceMediaType } from "@/lib/ad-spaces";

/**
 * נתוני מסך «ניהול לוז שטחי הפרסום» — תצוגת Gantt חודשית של כל נכסי המדיה
 * של בעל השטחים המחובר: מתי כל שטח משובץ (ובאיזה סטטוס) ומתי הוא פנוי.
 *
 * נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי"): assets של
 * AdSpaceOwnerProfile המחובר → bookings שחופפים לחודש המבוקש. הסלוטים הפנויים
 * מחושבים מהפערים בין השיבוצים בתוך החודש.
 */

export type ScheduleSegmentKind = "escrow" | "confirmed" | "broadcasting" | "completed";

export type ScheduleSegment = {
  /** יום התחלה בחודש (1..daysInMonth), חתוך לגבול החודש */
  startDay: number;
  /** יום סיום בחודש, כולל */
  endDay: number;
  kind: ScheduleSegmentKind;
  /** שם הקמפיין, ואם אין — שם המפרסם */
  label: string;
  sub: string | null;
  price: number | null;
  /** השיבוץ התחיל לפני תחילת החודש */
  clippedStart: boolean;
  /** השיבוץ נמשך אחרי סוף החודש */
  clippedEnd: boolean;
};

export type ScheduleFreeSlot = { startDay: number; endDay: number };

export type ScheduleRow = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  mediaLabel: string;
  isActive: boolean;
  segments: ScheduleSegment[];
  free: ScheduleFreeSlot[];
};

export type AdSpaceScheduleData =
  | { hasProfile: false }
  | {
      hasProfile: true;
      /** "אוגוסט 2026" */
      monthLabel: string;
      daysInMonth: number;
      /** יום בחודש אם זהו החודש הנוכחי, אחרת null */
      today: number | null;
      /** "YYYY-MM" לניווט */
      prevMonth: string;
      nextMonth: string;
      rows: ScheduleRow[];
      /** סיכום: כמה שטחים, כמה משובצים כרגע */
      totalAssets: number;
      bookedNow: number;
    };

const SEGMENT_STATUSES = ["RESERVED", "CONFIRMED", "BROADCASTING", "COMPLETED"] as const;

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** מנתח פרמטר "YYYY-MM" → היום הראשון של אותו חודש. לא תקין → החודש הנוכחי. */
export function parseMonthParam(param: string | undefined): Date {
  const now = new Date();
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return new Date(now.getFullYear(), now.getMonth(), 1);
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(year, month, 1);
}

function segmentKind(status: string, escrowHeld: boolean): ScheduleSegmentKind {
  if (status === "COMPLETED") return "completed";
  if (status === "BROADCASTING") return "broadcasting";
  if (status === "CONFIRMED") return "confirmed";
  return escrowHeld ? "confirmed" : "escrow";
}

export const getAdSpaceSchedule = cache(
  async (monthParam: string | undefined): Promise<AdSpaceScheduleData> => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { hasProfile: false };

    const monthStart = parseMonthParam(monthParam);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const monthEndOfDay = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const daysInMonth = monthEnd.getDate();

    const now = new Date();
    const today =
      now.getFullYear() === monthStart.getFullYear() && now.getMonth() === monthStart.getMonth()
        ? now.getDate()
        : null;

    const profile = await prisma.adSpaceOwnerProfile.findUnique({
      where: { userId },
      select: {
        assets: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            isActive: true,
            bookings: {
              where: {
                startDate: { lte: monthEndOfDay },
                endDate: { gte: monthStart },
                status: { in: [...SEGMENT_STATUSES] },
              },
              orderBy: { startDate: "asc" },
              select: {
                startDate: true,
                endDate: true,
                status: true,
                contract: {
                  select: {
                    agreedPriceILS: true,
                    business: { select: { name: true } },
                    campaign: { select: { title: true } },
                    escrowHold: { select: { status: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) return { hasProfile: false };

    let bookedNow = 0;

    const rows: ScheduleRow[] = profile.assets.map((asset) => {
      const mediaType = TYPE_TO_MEDIA[asset.type];

      const segments: ScheduleSegment[] = asset.bookings.map((b) => {
        const clippedStart = b.startDate < monthStart;
        const clippedEnd = b.endDate > monthEndOfDay;
        const startDay = clippedStart ? 1 : b.startDate.getDate();
        const endDay = clippedEnd ? daysInMonth : b.endDate.getDate();
        const campaignTitle = b.contract.campaign?.title ?? null;
        const businessName = b.contract.business?.name ?? null;

        return {
          startDay: Math.min(Math.max(startDay, 1), daysInMonth),
          endDay: Math.min(Math.max(endDay, startDay), daysInMonth),
          kind: segmentKind(b.status, b.contract.escrowHold?.status === "HELD"),
          label: campaignTitle ?? businessName ?? "שיבוץ",
          sub: campaignTitle && businessName ? businessName : null,
          price:
            b.contract.agreedPriceILS != null
              ? Math.round(Number(b.contract.agreedPriceILS))
              : null,
          clippedStart,
          clippedEnd,
        };
      });

      if (today != null && segments.some((s) => s.startDay <= today && s.endDay >= today)) {
        bookedNow += 1;
      }

      // סלוטים פנויים = ימים בחודש שאף שיבוץ לא מכסה
      const covered = new Array<boolean>(daysInMonth + 2).fill(false);
      for (const s of segments) {
        for (let d = s.startDay; d <= s.endDay; d++) covered[d] = true;
      }
      const free: ScheduleFreeSlot[] = [];
      let run: number | null = null;
      for (let d = 1; d <= daysInMonth; d++) {
        if (!covered[d] && run == null) run = d;
        if ((covered[d] || d === daysInMonth) && run != null) {
          free.push({ startDay: run, endDay: covered[d] ? d - 1 : d });
          run = null;
        }
      }

      return {
        id: asset.id,
        title: asset.title,
        mediaType,
        mediaLabel: MEDIA_TYPE_LABELS[mediaType],
        isActive: asset.isActive,
        segments,
        free,
      };
    });

    const prev = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    return {
      hasProfile: true,
      monthLabel: new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(
        monthStart,
      ),
      daysInMonth,
      today,
      prevMonth: monthKey(prev),
      nextMonth: monthKey(next),
      rows,
      totalAssets: rows.length,
      bookedNow,
    };
  },
);
