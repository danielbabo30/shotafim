import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/lib/app-user";
import { resolveCreatorId } from "@/lib/actions/settings-actions";
import { encryptOAuthToken } from "@/lib/oauth-crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { site } from "@/lib/site";
import { FACEBOOK_OAUTH_STATE_COOKIE } from "@/app/api/connect/facebook/route";

const REDIRECT_URI_PATH = "/api/connect/facebook/callback";
const SETTINGS_PATH = "/dashboard/settings";
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type FacebookTokenResponse = {
  access_token?: string;
  error?: { message?: string };
};

type FacebookPagesResponse = {
  data?: {
    id: string;
    name: string;
    access_token: string;
    link?: string;
    fan_count?: number;
    followers_count?: number;
    instagram_business_account?: { id: string };
  }[];
  error?: { message?: string };
};

type InstagramAccountResponse = {
  id: string;
  username?: string;
  followers_count?: number;
  error?: { message?: string };
};

function errorRedirect(reason: string) {
  return NextResponse.redirect(
    new URL(`${SETTINGS_PATH}?facebook=error&reason=${reason}`, site.url),
  );
}

/**
 * GET /api/connect/facebook/callback — סיום חיבור OAuth לפייסבוק/אינסטגרם (WP-5).
 * מאמת state מול העוגייה (CSRF), מחליף code בטוקן משתמש, ממנף לטוקן ארוך-טווח, שולף את
 * עמוד הפייסבוק העסקי הראשון של המשתמש (עם טוקן העמוד), ומעדכן/יוצר CreatorChannel
 * (platform=FACEBOOK). אם לעמוד מקושר חשבון אינסטגרם עסקי — שולף גם אותו ומעדכן/יוצר
 * CreatorChannel נוסף (platform=INSTAGRAM).
 */
export async function GET(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator")) {
    return NextResponse.redirect(new URL("/dashboard", site.url));
  }

  const creatorId = await resolveCreatorId(user);
  if (!creatorId) {
    return errorRedirect("no-creator");
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const savedState = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;

  // המשתמש ביטל את ההרשאה במסך של מטא
  if (oauthError) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}?facebook=cancelled`, site.url));
  }

  // אימות CSRF — לא לחשוף פרטים טכניים למשתמש הקצה
  if (!state || !savedState || state !== savedState) {
    console.error(
      `[facebook/callback] state-mismatch: url=${state ? "present" : "missing"} cookie=${savedState ? "present" : "missing"} match=${state === savedState}`,
    );
    const res = errorRedirect("state-mismatch");
    res.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
    return res;
  }

  if (!code) {
    return errorRedirect("missing-code");
  }

  if (!env.FACEBOOK_OAUTH_CLIENT_ID || !env.FACEBOOK_OAUTH_CLIENT_SECRET) {
    return errorRedirect("not-configured");
  }

  const redirectUri = new URL(REDIRECT_URI_PATH, site.url).toString();

  // שלב 1: החלפת code בטוקן משתמש קצר-טווח
  const shortTokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  shortTokenUrl.searchParams.set("client_id", env.FACEBOOK_OAUTH_CLIENT_ID);
  shortTokenUrl.searchParams.set("client_secret", env.FACEBOOK_OAUTH_CLIENT_SECRET);
  shortTokenUrl.searchParams.set("redirect_uri", redirectUri);
  shortTokenUrl.searchParams.set("code", code);

  const shortTokenRes = await fetch(shortTokenUrl.toString());
  const shortTokenData = (await shortTokenRes.json()) as FacebookTokenResponse;
  if (!shortTokenRes.ok || !shortTokenData.access_token) {
    return errorRedirect("token-exchange-failed");
  }

  // שלב 2: מינוף לטוקן משתמש ארוך-טווח (~60 יום) — טוקני העמוד שיתקבלו בהמשך יורשים תוקף דומה
  const longTokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  longTokenUrl.searchParams.set("client_id", env.FACEBOOK_OAUTH_CLIENT_ID);
  longTokenUrl.searchParams.set("client_secret", env.FACEBOOK_OAUTH_CLIENT_SECRET);
  longTokenUrl.searchParams.set("fb_exchange_token", shortTokenData.access_token);

  const longTokenRes = await fetch(longTokenUrl.toString());
  const longTokenData = (await longTokenRes.json()) as FacebookTokenResponse;
  const userAccessToken = longTokenData.access_token ?? shortTokenData.access_token;

  // שלב 3: עמודי הפייסבוק העסקיים — כולל נתוני העמוד וקישור לחשבון אינסטגרם עסקי בבקשה אחת
  const pagesUrl = new URL(`${GRAPH_BASE}/me/accounts`);
  pagesUrl.searchParams.set(
    "fields",
    "id,name,access_token,link,fan_count,followers_count,instagram_business_account",
  );
  pagesUrl.searchParams.set("access_token", userAccessToken);
  const pagesRes = await fetch(pagesUrl.toString());
  const pagesData = (await pagesRes.json()) as FacebookPagesResponse;
  const pages = pagesData.data ?? [];
  // מעדיפים עמוד שיש לו חשבון אינסטגרם מקושר; אחרת העמוד הראשון
  const page = pages.find((p) => p.instagram_business_account?.id) ?? pages[0];
  if (!pagesRes.ok || !page) {
    console.error(
      `[facebook/callback] no-pages: ok=${pagesRes.ok} count=${pages.length} err=${pagesData.error?.message ?? "none"}`,
    );
    return errorRedirect("no-pages");
  }

  console.info(
    `[facebook/callback] page="${page.name}" fan=${page.fan_count} followers=${page.followers_count} ig=${page.instagram_business_account?.id ?? "none"} (pages total=${pages.length})`,
  );

  const pageAccessTokenEnc = encryptOAuthToken(page.access_token);
  const now = new Date();
  const fbFollowers = page.followers_count ?? page.fan_count ?? 0;

  await prisma.creatorChannel.upsert({
    where: { creatorId_platform: { creatorId, platform: "FACEBOOK" } },
    create: {
      creatorId,
      platform: "FACEBOOK",
      handle: page.name,
      channelUrl: page.link ?? `https://www.facebook.com/${page.id}`,
      followersCount: fbFollowers,
      externalAccountId: page.id,
      oauthRefreshTokenEnc: pageAccessTokenEnc,
      oauthScope: "pages_show_list,pages_read_engagement",
      oauthTokenUpdatedAt: now,
      isChannelVerified: true,
      lastSyncedAt: now,
    },
    update: {
      handle: page.name,
      channelUrl: page.link ?? `https://www.facebook.com/${page.id}`,
      followersCount: fbFollowers,
      externalAccountId: page.id,
      oauthRefreshTokenEnc: pageAccessTokenEnc,
      oauthScope: "pages_show_list,pages_read_engagement",
      oauthTokenUpdatedAt: now,
      isChannelVerified: true,
      lastSyncedAt: now,
    },
  });

  // שלב 4: אם לעמוד מקושר חשבון אינסטגרם עסקי — שולפים גם אותו ושומרים כערוץ נפרד
  const igAccountId = page.instagram_business_account?.id;
  if (!igAccountId) {
    console.info(
      `[facebook/callback] no linked Instagram business account on page "${page.name}" — Facebook connected, Instagram skipped`,
    );
  }
  if (igAccountId) {
    const igUrl = new URL(`${GRAPH_BASE}/${igAccountId}`);
    igUrl.searchParams.set("fields", "username,followers_count");
    igUrl.searchParams.set("access_token", page.access_token);
    const igRes = await fetch(igUrl.toString());
    const igData = (await igRes.json()) as InstagramAccountResponse;
    if (!igRes.ok || !igData.username) {
      console.error(
        `[facebook/callback] instagram fetch failed: ok=${igRes.ok} err=${igData.error?.message ?? "none"}`,
      );
    }

    if (igRes.ok && igData.username) {
      await prisma.creatorChannel.upsert({
        where: { creatorId_platform: { creatorId, platform: "INSTAGRAM" } },
        create: {
          creatorId,
          platform: "INSTAGRAM",
          handle: `@${igData.username}`,
          channelUrl: `https://www.instagram.com/${igData.username}`,
          followersCount: igData.followers_count ?? 0,
          externalAccountId: igData.id,
          oauthRefreshTokenEnc: pageAccessTokenEnc,
          oauthScope: "instagram_basic",
          oauthTokenUpdatedAt: now,
          isChannelVerified: true,
          lastSyncedAt: now,
        },
        update: {
          handle: `@${igData.username}`,
          channelUrl: `https://www.instagram.com/${igData.username}`,
          followersCount: igData.followers_count ?? 0,
          externalAccountId: igData.id,
          oauthRefreshTokenEnc: pageAccessTokenEnc,
          oauthScope: "instagram_basic",
          oauthTokenUpdatedAt: now,
          isChannelVerified: true,
          lastSyncedAt: now,
        },
      });
    }
  }

  const res = NextResponse.redirect(new URL(`${SETTINGS_PATH}?facebook=connected`, site.url));
  res.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
  return res;
}
