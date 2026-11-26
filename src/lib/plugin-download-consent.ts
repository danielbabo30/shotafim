import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { PLUGIN_TERMS_VERSION } from "@/lib/plugin-terms";

const DIST = path.join(process.cwd(), "wp-plugin", "dist");
export const PLUGIN_ZIP_PATH = path.join(DIST, "bridgead-woo-plugin.zip");

/** גרסת התוסף מ-wp-plugin/dist/version.txt (אופציונלי). */
export async function readPluginVersion(): Promise<string> {
  try {
    return (await readFile(path.join(DIST, "version.txt"), "utf8")).trim();
  } catch {
    return "";
  }
}

/** אישור התקנון האחרון של המשתמש המחובר לגרסת התקנון הנוכחית (או null). */
export const getMyPluginTermsConsent = cache(async () => {
  const user = await requireActiveUser();
  return prisma.pluginDownloadConsent.findFirst({
    where: { userId: user.id, termsVersion: PLUGIN_TERMS_VERSION },
    orderBy: { acceptedAt: "desc" },
    select: { acceptedAt: true, downloadedAt: true },
  });
});
