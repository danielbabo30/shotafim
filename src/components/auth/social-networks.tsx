import type { SocialPlatform } from "@prisma/client";

/**
 * רשימת הרשתות החברתיות שניתן לחבר בפרופיל היוצר.
 * הסמלים הם גליפים מותגיים מפושטים; הצבע הוא של המותג (חריג ל-design tokens, כמו לוגו Google).
 * `id` = ה-literal של SocialPlatform ב-Prisma — נשלח כ-value בטופס.
 */

type Glyph = (p: { className?: string }) => React.ReactElement;

export type SocialNetwork = {
  id: SocialPlatform;
  name: string;
  hint: string;
  iconClass: string;
  Icon: Glyph;
};

const YouTubeGlyph: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M23 12s0-3.6-.5-5.3a2.8 2.8 0 0 0-2-2C18.8 4.3 12 4.3 12 4.3s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 2 2 1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4c1-.3 1.7-1 2-2C23 15.6 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
  </svg>
);

const InstagramGlyph: Glyph = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
    aria-hidden
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const TikTokGlyph: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M16 3c.3 2.1 1.6 3.7 3.7 4v3c-1.4 0-2.7-.4-3.9-1.1v6.6A6.5 6.5 0 1 1 9 8.9v3.2a3.3 3.3 0 1 0 2.3 3.1V3H16z" />
  </svg>
);

const LinkedInGlyph: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M4.5 3A1.5 1.5 0 1 0 4.5 6a1.5 1.5 0 0 0 0-3zM3.3 8h2.4v13H3.3V8zm5 0h2.3v1.8h.03c.32-.6 1.1-1.8 3-1.8 3.2 0 3.8 2.1 3.8 4.9V21h-2.4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H8.3V8z" />
  </svg>
);

const FacebookGlyph: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.7-3.5H13.5V8.6c0-.4.2-.6.5-.6z" />
  </svg>
);

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    id: "YOUTUBE",
    name: "YouTube",
    hint: "ערוץ הסרטונים",
    iconClass: "bg-[#FF0000]/10 text-[#FF0000]",
    Icon: YouTubeGlyph,
  },
  {
    id: "INSTAGRAM",
    name: "Instagram",
    hint: "עוקבים, סיפורים ושיעורי מעורבות",
    iconClass: "bg-[#E4405F]/10 text-[#E4405F]",
    Icon: InstagramGlyph,
  },
  {
    id: "TIKTOK",
    name: "TikTok",
    hint: "עוקבים וצפיות בסרטונים",
    iconClass: "bg-on-surface/10 text-on-surface",
    Icon: TikTokGlyph,
  },
  {
    id: "LINKEDIN",
    name: "LinkedIn",
    hint: "קשרים וחשיפת פוסטים מקצועיים",
    iconClass: "bg-[#0A66C2]/10 text-[#0A66C2]",
    Icon: LinkedInGlyph,
  },
  {
    id: "FACEBOOK",
    name: "Facebook",
    hint: "עוקבי עמוד ומעורבות",
    iconClass: "bg-[#1877F2]/10 text-[#1877F2]",
    Icon: FacebookGlyph,
  },
];
