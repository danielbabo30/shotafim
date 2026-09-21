import "server-only";
import { cache } from "react";
import type { SiteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/**
 * חיבור חנות WooCommerce לתוסף המעקב (WP-4).
 * המפרסם מייצר "קוד צימוד" באזור האישי → מדביק אותו בתוסף → התוסף מזדהה מולנו.
 *
 * קוד הצימוד = `<siteId>.<apiKey>` (siteId = TrackedSite.id, apiKey = 40-char base32).
 * מוצג פעם אחת. הקריפטו של המפתח (יצירה / hash / הצפנה) ב-src/lib/track/crypto.ts (WP-2).
 */

export type ConnectedStore = {
  id: string;
  siteUrl: string;
  status: SiteStatus;
  lastHeartbeatAt: Date | null;
  pluginVersion: string | null;
  pairedAt: Date;
};

export type PluginConnectionData =
  { hasBusiness: false } | { hasBusiness: true; businessId: string; stores: ConnectedStore[] };

/** קוד הצימוד שהמפרסם מדביק בתוסף — פורמט ה-UI. התוסף מפצל ל-siteId + apiKey. */
export const pairingToken = (siteId: string, apiKey: string): string => `${siteId}.${apiKey}`;

export const getPluginConnections = cache(async (): Promise<PluginConnectionData> => {
  const user = await requireActiveUser();

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return { hasBusiness: false };

  const stores = await prisma.trackedSite.findMany({
    where: { businessId: business.id },
    orderBy: { pairedAt: "asc" },
    select: {
      id: true,
      siteUrl: true,
      status: true,
      lastHeartbeatAt: true,
      pluginVersion: true,
      pairedAt: true,
    },
  });

  return { hasBusiness: true, businessId: business.id, stores };
});
