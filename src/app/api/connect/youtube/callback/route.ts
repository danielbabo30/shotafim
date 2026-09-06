import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireActiveUser } from "@/lib/app-user";
import { resolveCreatorId } from "@/lib/actions/settings-actions";
import { encryptOAuthToken } from "@/lib/oauth-crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { site } from "@/lib/site";
import { YOUTUBE_OAUTH_STATE_COOKIE } from "@/app/api/connect/youtube/route";

const REDIRECT_URI_PATH = "/api/connect/youtube/callback";
const SETTINGS_PATH = "/dashboard/settings";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type YouTubeChannelsResponse = {
  items?: {
    id: string;
    snippet?: { title?: string; customUrl?: string };
    statistics?: {
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
    };
  }[];
};

function errorRedirect(reason: string) {
  return NextResponse.redirect(
    new URL(`${SETTINGS_PATH}?youtube=error&reason=${reason}`, site.url),
  );
}

/**
 * GET /api/connect/youtube/callback — סיום חיבור OAuth ליוטיוב (WP-5).
 * מאמת state מול העוגייה (CSRF), מחליף code בטוקנים, קורא נתוני ערוץ אמיתיים מ-YouTube Data API,
 * ומעדכן/יוצר CreatorChannel (platform=YOUTUBE) עם הטוקן המוצפן ונתוני הערוץ האמיתיים.
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

  const cookieStore = await cookies();
  const savedState = cookieStore.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(YOUTUBE_OAUTH_STATE_COOKIE);

  // המשתמש ביטל את ההרשאה במסך של גוגל
  if (oauthError) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}?youtube=cancelled`, site.url));
  }

  // אימות CSRF — לא לחשוף פרטים טכניים למשתמש הקצה
  if (!state || !savedState || state !== savedState) {
    return errorRedirect("state-mismatch");
  }

  if (!code) {
    return errorRedirect("missing-code");
  }

  if (!env.YOUTUBE_OAUTH_CLIENT_ID || !env.YOUTUBE_OAUTH_CLIENT_SECRET) {
    return errorRedirect("not-configured");
  }

  const redirectUri = new URL(REDIRECT_URI_PATH, site.url).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.YOUTUBE_OAUTH_CLIENT_ID,
      client_secret: env.YOUTUBE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    return errorRedirect("token-exchange-failed");
  }

  const existingChannel = await prisma.creatorChannel.findUnique({
    where: { creatorId_platform: { creatorId, platform: "YOUTUBE" } },
    select: { oauthRefreshTokenEnc: true },
  });

  // אם לא התקבל refresh_token חדש (המשתמש כבר אישר בעבר) — יש לשמר את הקיים.
  // אם גם אין קיים ב-DB — אין דרך לרענן טוקן בעתיד; מכריחים ניסיון חוזר (prompt=consent כבר מוגדר ב-route ההתחלה).
  let refreshTokenEnc: string | undefined;
  if (tokenData.refresh_token) {
    refreshTokenEnc = encryptOAuthToken(tokenData.refresh_token);
  } else if (existingChannel?.oauthRefreshTokenEnc) {
    refreshTokenEnc = existingChannel.oauthRefreshTokenEnc;
  } else {
    return errorRedirect("no-refresh-token");
  }

  const channelsRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );
  const channelsData = (await channelsRes.json()) as YouTubeChannelsResponse;
  const channel = channelsData.items?.[0];
  if (!channelsRes.ok || !channel) {
    return errorRedirect("channel-fetch-failed");
  }

  const externalAccountId = channel.id;
  const handle = channel.snippet?.title ?? externalAccountId;
  const channelUrl = channel.snippet?.customUrl
    ? `https://www.youtube.com/${channel.snippet.customUrl}`
    : `https://www.youtube.com/channel/${externalAccountId}`;
  const followersCount =
    channel.statistics?.hiddenSubscriberCount || !channel.statistics?.subscriberCount
      ? 0
      : parseInt(channel.statistics.subscriberCount, 10);

  await prisma.creatorChannel.upsert({
    where: { creatorId_platform: { creatorId, platform: "YOUTUBE" } },
    create: {
      creatorId,
      platform: "YOUTUBE",
      handle,
      channelUrl,
      followersCount,
      externalAccountId,
      oauthRefreshTokenEnc: refreshTokenEnc,
      oauthScope: tokenData.scope ?? null,
      oauthTokenUpdatedAt: new Date(),
      isChannelVerified: true,
      lastSyncedAt: new Date(),
    },
    update: {
      handle,
      channelUrl,
      followersCount,
      externalAccountId,
      oauthRefreshTokenEnc: refreshTokenEnc,
      oauthScope: tokenData.scope ?? null,
      oauthTokenUpdatedAt: new Date(),
      isChannelVerified: true,
      lastSyncedAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL(`${SETTINGS_PATH}?youtube=connected`, site.url));
}
