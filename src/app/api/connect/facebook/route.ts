import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/app-user";
import { resolveCreatorId } from "@/lib/actions/settings-actions";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { site } from "@/lib/site";

/**
 * GET /api/connect/facebook — התחלת חיבור OAuth אמיתי לפייסבוק/אינסטגרם (WP-5).
 * שומר `state` אקראי בעוגייה httpOnly קצרת-טווח (הגנת CSRF), ומפנה ל-Facebook Login dialog.
 * ה-redirect_uri קבוע מול Meta for Developers — אסור לשנות את הנתיב.
 * scopes: pages_show_list + pages_read_engagement (נתוני עמוד עסקי) + instagram_basic +
 * instagram_manage_insights (נתוני חשבון אינסטגרם עסקי מקושר לעמוד).
 */
export const FACEBOOK_OAUTH_STATE_COOKIE = "facebook_oauth_state";
const REDIRECT_URI_PATH = "/api/connect/facebook/callback";
const GRAPH_VERSION = "v21.0";

export async function GET() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator")) {
    return NextResponse.redirect(new URL("/dashboard", site.url));
  }

  if (!env.FACEBOOK_OAUTH_CLIENT_ID) {
    return NextResponse.redirect(new URL("/dashboard/settings?facebook=error", site.url));
  }

  // חובה: הסכמת היוצר להעברת נתונים נרשמה לפני החיבור (פייסבוק/אינסטגרם — אותה זרימה).
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) {
    return NextResponse.redirect(new URL("/dashboard", site.url));
  }
  const consent = await prisma.creatorSocialConsent.findFirst({
    where: { creatorId, platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
    select: { id: true },
  });
  if (!consent) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?facebook=consent-required", site.url),
    );
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = new URL(REDIRECT_URI_PATH, site.url).toString();

  const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  authUrl.searchParams.set("client_id", env.FACEBOOK_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  if (env.FACEBOOK_LOGIN_CONFIG_ID) {
    // "Facebook Login for Business" — ההרשאות והנכסים מגיעים מה-Configuration, לא מ-scope.
    authUrl.searchParams.set("config_id", env.FACEBOOK_LOGIN_CONFIG_ID);
    authUrl.searchParams.set("override_default_response_type", "true");
  } else {
    // נפילה חזרה ל-Facebook Login הקלאסי (scope ב-URL). מינימום למשיכת נתוני עוקבים:
    // pages_show_list + pages_read_engagement ("read followers data") + instagram_basic.
    authUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,instagram_basic");
  }

  // מגדירים את עוגיית ה-state ישירות על תגובת ה-redirect (לא דרך cookies() store) כדי
  // להבטיח שה-Set-Cookie נשלח יחד עם ה-307. secure=true — הסביבה תמיד HTTPS.
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60, // שעה — מספיק גם אם המשתמש מחליף חשבון פייסבוק באמצע
    path: "/",
  });
  return response;
}
