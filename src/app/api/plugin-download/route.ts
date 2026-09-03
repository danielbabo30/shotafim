import { readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * הורדת תוסף המעקב של WooCommerce — למשתמש מסוג מפרסם (BRAND) בלבד.
 * ה-ZIP נבנה ע"י wp-plugin/build.mjs ומקומיט תחת wp-plugin/dist; ב-Vercel הוא מצורף
 * ל-serverless function דרך outputFileTracingIncludes ב-next.config.ts.
 */

const DIST = path.join(process.cwd(), "wp-plugin", "dist");
const ZIP = path.join(DIST, "bridgead-woo-plugin.zip");
const VERSION_FILE = path.join(DIST, "version.txt");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true, status: true, deletedAt: true },
  });

  if (
    !user ||
    user.deletedAt ||
    user.status === "SUSPENDED" ||
    user.status === "BANNED" ||
    !user.roles.includes("BRAND")
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  let zip: Buffer;
  try {
    zip = await readFile(ZIP);
  } catch {
    return new Response("Plugin build not available", { status: 404 });
  }

  let version = "";
  try {
    version = (await readFile(VERSION_FILE, "utf8")).trim();
  } catch {
    // version.txt אופציונלי — נשתמש בשם בסיס
  }
  const filename = version ? `bridgead-woo-plugin-${version}.zip` : "bridgead-woo-plugin.zip";

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
