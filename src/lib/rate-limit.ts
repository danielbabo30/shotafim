import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Rate limiting — sliding window log, בזיכרון התהליך.
 *
 * ⚠️ מגבלת multi-instance: המצב חי בזיכרון של instance אחד. בפריסה עם כמה instances /
 * serverless (Vercel) כל instance סופר לבד — ההגבלה האפקטיבית היא עד פי N מהמוגדר,
 * ובכל cold start המונים מתאפסים. זו שכבת הגנה בסיסית נגד ספאם/brute-force, לא תחליף
 * ל-WAF. להחלפה ב-Upstash/Redis: ממשו `RateLimitStore` (שיטת `hit` אחת) והחליפו את
 * `store` בסוף הקובץ — אף קורא אחר לא צריך להשתנות (כל ה-API אסינכרוני בכוונה).
 *
 * שימוש:
 *   - server action:   const limited = await rateLimitAction("sendMessage", 20, 60, userId);
 *   - route handler:   const limited = await rateLimitRequest(request, "track:click", 300, 60);
 */

export type RateLimitResult = {
  ok: boolean;
  /** כמה בקשות נותרו בחלון */
  remaining: number;
  /** כמה שניות לחכות לפני ניסיון חוזר (רלוונטי כש-ok=false) */
  retryAfterSec: number;
};

/** חוזה ההחלפה ל-Redis: רושם "פגיעה" אחת למפתח ומחזיר את התוצאה. */
export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

const MAX_KEYS = 10_000;

class MemorySlidingWindowStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now, windowMs);

    const windowStart = now - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= limit) {
      this.hits.set(key, recent);
      const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      return { ok: false, remaining: 0, retryAfterSec };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { ok: true, remaining: limit - recent.length, retryAfterSec: 0 };
  }

  /** ניקוי תקופתי + תקרת מפתחות — מונע דליפת זיכרון */
  private sweep(now: number, windowMs: number) {
    if (now - this.lastSweep < 60_000 && this.hits.size < MAX_KEYS) return;
    this.lastSweep = now;
    for (const [k, arr] of this.hits) {
      if (arr.length === 0 || arr[arr.length - 1] <= now - windowMs) this.hits.delete(k);
    }
    if (this.hits.size >= MAX_KEYS) this.hits.clear();
  }
}

// singleton שורד hot-reload ב-dev
const globalForRl = globalThis as unknown as { __rateLimitStore?: RateLimitStore };
const store: RateLimitStore = (globalForRl.__rateLimitStore ??= new MemorySlidingWindowStore());

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  return store.hit(key, limit, windowSec * 1000);
}

/**
 * כתובת IP של הלקוח. בפלטפורמות מאחורי proxy מהימן (Vercel) הכותרות נקבעות ע"י ה-proxy.
 * ללא proxy מהימן הן ניתנות לזיוף — ההגבלה אז "best effort" (ראו הערת multi-instance).
 */
export function clientIpFromHeaders(h: Pick<Headers, "get">): string {
  const real = h.get("x-real-ip") ?? h.get("x-vercel-forwarded-for");
  if (real) return real.trim().slice(0, 64);
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

/** לשימוש ב-route handlers. מחזיר Response 429 כשחרגו, אחרת null. */
export async function rateLimitRequest(
  request: Request,
  route: string,
  limit: number,
  windowSec: number,
  extraKey?: string,
): Promise<NextResponse | null> {
  const ip = clientIpFromHeaders(request.headers);
  const res = await rateLimit(`${route}|${ip}${extraKey ? `|${extraKey}` : ""}`, limit, windowSec);
  if (res.ok) return null;
  return NextResponse.json(
    { error: "יותר מדי בקשות. נסו שוב מאוחר יותר." },
    { status: 429, headers: { "Retry-After": String(res.retryAfterSec) } },
  );
}

/**
 * לשימוש ב-server actions. מפתח = route + IP (+ extraKey, למשל userId/מייל).
 * מחזיר true אם חרגו (הקורא אחראי להחזיר שגיאה/redirect בהתאם לחתימת הפעולה).
 */
export async function isRateLimited(
  route: string,
  limit: number,
  windowSec: number,
  extraKey?: string,
): Promise<boolean> {
  const ip = clientIpFromHeaders(await headers());
  const res = await rateLimit(`${route}|${ip}${extraKey ? `|${extraKey}` : ""}`, limit, windowSec);
  return !res.ok;
}
