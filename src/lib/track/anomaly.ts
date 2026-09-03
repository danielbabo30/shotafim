import "server-only";
import type { AnomalySeverity, AnomalyType } from "@prisma/client";
import { Prisma as P } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * "תשלום פר רכישה" — דגלי אנומליה אוטומטיים (WP-2, §7).
 * נכתבים ב-monitor cron, נקראים ע"י האדמין (WP-3b) ומצורפים לתיקי מחלוקת.
 * שמרני בכוונה — מסמן לבדיקה אנושית, לא חוסם אוטומטית.
 */

const DAY = 864e5;

/** לא יוצרים דגל חוזר מאותו סוג אם יש דגל לא-פתור מ-24 השעות האחרונות. */
async function alreadyFlagged(programId: string, type: AnomalyType): Promise<boolean> {
  const recent = await prisma.anomalyFlag.findFirst({
    where: { programId, type, detectedAt: { gte: new Date(Date.now() - DAY) } },
    select: { id: true },
  });
  return recent != null;
}

async function raise(
  programId: string,
  type: AnomalyType,
  severity: AnomalySeverity,
  detail: string,
  metricValue?: number,
): Promise<number> {
  if (await alreadyFlagged(programId, type)) return 0;
  try {
    await prisma.anomalyFlag.create({
      data: {
        programId,
        type,
        severity,
        detail,
        metricValue: metricValue != null ? new P.Decimal(metricValue) : null,
      },
    });
    return 1;
  } catch (e) {
    // התנגשות @@unique([programId,type,detectedAt]) — נדיר
    if (e instanceof P.PrismaClientKnownRequestError && e.code === "P2002") return 0;
    throw e;
  }
}

export async function detectAnomalies(
  programId: string,
  creatorCustomerHashes: string[],
): Promise<number> {
  const now = Date.now();
  let raised = 0;

  const orders = await prisma.attributedOrder.findMany({
    where: { programId },
    select: {
      id: true,
      status: true,
      orderPlacedAt: true,
      customerHash: true,
      reversedAt: true,
      payoutCheckpointId: true,
    },
    orderBy: { orderPlacedAt: "asc" },
  });
  if (orders.length === 0) return 0;

  // 1. SELF_PURCHASE — customerHash של היוצר
  if (creatorCustomerHashes.length > 0) {
    const selfBuys = orders.filter((o) => creatorCustomerHashes.includes(o.customerHash));
    if (selfBuys.length > 0) {
      raised += await raise(
        programId,
        "SELF_PURCHASE",
        "HIGH",
        `${selfBuys.length} הזמנות משויכות עם customerHash של היוצר`,
        selfBuys.length,
      );
    }
  }

  // 2. RETURN_RATE_SPIKE — שיעור החזרות > 25% עם נפח מינימלי
  const total = orders.length;
  const reversed = orders.filter((o) => o.status === "REVERSED" || o.reversedAt != null).length;
  if (total >= 8) {
    const rate = reversed / total;
    if (rate > 0.25) {
      raised += await raise(
        programId,
        "RETURN_RATE_SPIKE",
        rate > 0.5 ? "HIGH" : "MEDIUM",
        `שיעור החזרות ${(rate * 100).toFixed(0)}% (${reversed}/${total})`,
        rate,
      );
    }
  }

  // 3. POST_CHECKPOINT_RETURN — הזמנה ששולמה ואז בוטלה
  const postCp = orders.filter((o) => o.payoutCheckpointId != null && o.reversedAt != null);
  if (postCp.length > 0) {
    raised += await raise(
      programId,
      "POST_CHECKPOINT_RETURN",
      "MEDIUM",
      `${postCp.length} הזמנות בוטלו אחרי ששולמו בתחנה`,
      postCp.length,
    );
  }

  // 4. VELOCITY_SPIKE / DROP — קצב 3 ימים אחרונים מול ממוצע 14 יום
  const recentCount = orders.filter((o) => now - o.orderPlacedAt.getTime() <= 3 * DAY).length;
  const baselineCount = orders.filter((o) => {
    const age = now - o.orderPlacedAt.getTime();
    return age > 3 * DAY && age <= 17 * DAY;
  }).length;
  const recentPerDay = recentCount / 3;
  const baselinePerDay = baselineCount / 14;
  if (baselineCount >= 7) {
    if (recentPerDay > baselinePerDay * 3) {
      raised += await raise(
        programId,
        "VELOCITY_SPIKE",
        "MEDIUM",
        `קצב הזמנות פי ${(recentPerDay / Math.max(baselinePerDay, 0.01)).toFixed(1)} מהממוצע`,
        recentPerDay,
      );
    } else if (recentPerDay < baselinePerDay * 0.2 && recentCount === 0) {
      raised += await raise(
        programId,
        "VELOCITY_DROP",
        "LOW",
        "אין הזמנות ב-3 הימים האחרונים למרות פעילות קודמת",
        0,
      );
    }
  }

  // 5. CLICK_ORDER_RATIO_DROP — יחס קליקים→הזמנות שצנח
  const clicks = await prisma.affiliateClick.groupBy({
    by: ["programId"],
    where: { programId },
    _count: true,
  });
  const clickCount = clicks[0]?._count ?? 0;
  if (clickCount >= 50 && total < clickCount * 0.005) {
    raised += await raise(
      programId,
      "CLICK_ORDER_RATIO_DROP",
      "LOW",
      `${clickCount} קליקים, ${total} הזמנות — יחס המרה חריג בנמיכותו`,
      total / Math.max(clickCount, 1),
    );
  }

  return raised;
}
