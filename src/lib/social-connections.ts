import type { SocialPlatform } from "@prisma/client";
import { SOCIAL_NETWORKS } from "@/components/auth/social-networks";

/**
 * מצב חיבור רשת חברתית אחת עבור יוצר — משמש גם במסך "ההרשמה הושלמה" וגם בהגדרות.
 * הממשק נועד למשיכת נתוני היוצר (עוקבים, מעורבות) מהפלטפורמה — לא להתחברות למערכת.
 */

/** פלטפורמות עם אינטגרציית OAuth אמיתית פעילה. השאר — "בקרוב". */
export const OAUTH_READY_PLATFORMS: SocialPlatform[] = ["YOUTUBE", "FACEBOOK", "INSTAGRAM"];

/** נתיב ה-route שמתחיל את זרימת ה-OAuth לכל פלטפורמה (אינסטגרם מתחבר יחד עם עמוד הפייסבוק). */
export const CONNECT_PATH: Partial<Record<SocialPlatform, string>> = {
  YOUTUBE: "/api/connect/youtube",
  FACEBOOK: "/api/connect/facebook",
  INSTAGRAM: "/api/connect/facebook",
};

export type SocialConnectionVM = {
  platform: SocialPlatform;
  name: string;
  /** האם קיימת אינטגרציה פעילה (אחרת — "בקרוב") */
  oauthReady: boolean;
  /** נתיב התחלת החיבור, אם יש */
  connectPath: string | null;
  /** האם קיים ערוץ מחובר (שורת CreatorChannel) לפלטפורמה */
  connected: boolean;
  /** האם הערוץ מסונכרן דרך OAuth אמיתי (אחרת — נתונים שהוזנו ידנית בעבר, לפני מעבר ל-OAuth) */
  synced: boolean;
  channelId: string | null;
  handle: string | null;
  followersCount: number | null;
  /** מתי ניתנה הסכמת העברת הנתונים (ISO). null = טרם ניתנה — כפתור החיבור חסום. */
  consentedAt: string | null;
};

type ChannelRow = {
  id: string;
  platform: SocialPlatform;
  handle: string;
  followersCount: number;
  oauthTokenUpdatedAt: Date | null;
};

type ConsentRow = { platform: SocialPlatform; consentedAt: Date };

/**
 * בונה את מצב 5 הרשתות מתוך שורות ה-channels וה-consents של היוצר.
 * פונקציה טהורה — כל עמוד שולף את הנתונים שלו וקורא לה.
 */
export function buildSocialConnections(
  channels: ChannelRow[],
  consents: ConsentRow[],
): SocialConnectionVM[] {
  const channelByPlatform = new Map(channels.map((c) => [c.platform, c]));
  const consentByPlatform = new Map(consents.map((c) => [c.platform, c.consentedAt]));

  return SOCIAL_NETWORKS.map((net) => {
    const channel = channelByPlatform.get(net.id);
    const connected = channel != null;
    const synced = channel?.oauthTokenUpdatedAt != null;
    const consentedAt = consentByPlatform.get(net.id) ?? null;
    return {
      platform: net.id,
      name: net.name,
      oauthReady: OAUTH_READY_PLATFORMS.includes(net.id),
      connectPath: CONNECT_PATH[net.id] ?? null,
      connected,
      synced,
      channelId: channel?.id ?? null,
      handle: channel?.handle ?? null,
      followersCount: channel?.followersCount ?? null,
      consentedAt: consentedAt ? consentedAt.toISOString() : null,
    };
  });
}
