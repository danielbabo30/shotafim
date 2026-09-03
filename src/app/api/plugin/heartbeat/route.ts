import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { heartbeatPayloadSchema } from "@/lib/track/schemas";
import { badRequest, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/plugin/heartbeat — אות חיים כל 6 שעות (§5). מחזיר אתר ל-ACTIVE. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = heartbeatPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);
  const hb = parsed.data;

  const now = new Date();
  const wasDown = auth.site.status === "STALE" || auth.site.status === "OFFLINE";

  await prisma.$transaction(async (tx) => {
    await tx.trackedSite.update({
      where: { id: auth.site.id },
      data: {
        lastHeartbeatAt: now,
        pluginVersion: hb.pluginVersion,
        wooVersion: hb.wooVersion,
        wpVersion: hb.wpVersion ?? null,
        phpVersion: hb.phpVersion ?? null,
        ...(auth.site.status === "DEACTIVATED"
          ? {}
          : { status: "ACTIVE", staleAt: null, offlineAt: null }),
      },
    });
    if (wasDown) {
      await tx.pluginAlert.updateMany({
        where: { siteId: auth.site.id, type: "HEARTBEAT_ABSENT", resolvedAt: null },
        data: { resolvedAt: now },
      });
    }
  });

  const linksLive = await prisma.partnerProgram.count({
    where: {
      contract: { businessId: auth.site.businessId },
      status: { in: ["ACTIVE", "GATE_80"] },
    },
  });

  return ok({
    siteStatus: "ACTIVE",
    linksLive,
    serverTime: now.toISOString(),
    recoveredFrom: wasDown ? auth.site.status : null,
  });
}
