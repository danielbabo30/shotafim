import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { deactivatedPayloadSchema } from "@/lib/track/schemas";
import { MONITOR_GRACE_HOURS } from "@/lib/partner-constants";
import { emailSiteAdminTrackingOffline, notifyPartnership } from "@/lib/track/notify";
import { badRequest, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/plugin/deactivated — register_deactivation_hook (§5). best-effort. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = deactivatedPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);

  const now = new Date();
  const graceEndsAt = new Date(now.getTime() + MONITOR_GRACE_HOURS * 3600_000);

  const programs = await prisma.partnerProgram.findMany({
    where: {
      contract: { businessId: auth.site.businessId },
      status: { in: ["ACTIVE", "GATE_80"] },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.trackedSite.update({
      where: { id: auth.site.id },
      data: { status: "DEACTIVATED", offlineAt: now },
    });
    await tx.pluginAlert.create({
      data: {
        siteId: auth.site.id,
        programId: programs[0]?.id ?? null,
        type: "DEACTIVATED",
        detail: parsed.data.reason ?? null,
        notifiedAt: now,
        graceEndsAt,
      },
    });
  });

  for (const p of programs) {
    await notifyPartnership(p.id, "TRACKING_OFFLINE", {}, "both");
    await notifyPartnership(p.id, "TRACKING_OFFLINE", {}, "admin");
  }
  await emailSiteAdminTrackingOffline(auth.site.id);

  return ok({ graceEndsAt: graceEndsAt.toISOString() });
}
