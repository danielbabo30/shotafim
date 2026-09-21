import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireActiveUser } from "@/lib/app-user";
import { resolveCreatorId } from "@/lib/actions/settings-actions";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { site } from "@/lib/site";

/**
 * GET /api/connect/youtube — התחלת חיבור OAuth אמיתי ליוטיוב (WP-5).
 * שומר `state` אקראי בעוגייה httpOnly קצרת-טווח (הגנת CSRF), ומפנה ל-Google OAuth consent screen.
 * ה-redirect_uri קבוע מול Google Console — אסור לשנות את הנתיב.
 */
export const YOUTUBE_OAUTH_STATE_COOKIE = "youtube_oauth_state";
const REDIRECT_URI_PATH = "/api/connect/youtube/callback";

export async function GET() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator")) {
    return NextResponse.redirect(new URL("/dashboard", site.url));
  }

  if (!env.YOUTUBE_OAUTH_CLIENT_ID) {
    return NextResponse.redirect(new URL("/dashboard/settings?youtube=error", site.url));
  }

  // חובה: הסכמת היוצר להעברת נתונים נרשמה לפני החיבור (ראה recordSocialConsent).
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) {
    return NextResponse.redirect(new URL("/dashboard", site.url));
  }
  const consent = await prisma.creatorSocialConsent.findUnique({
    where: { creatorId_platform: { creatorId, platform: "YOUTUBE" } },
    select: { id: true },
  });
  if (!consent) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?youtube=consent-required", site.url),
    );
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(YOUTUBE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 דקות
    path: "/",
  });

  const redirectUri = new URL(REDIRECT_URI_PATH, site.url).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.YOUTUBE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
