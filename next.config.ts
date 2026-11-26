import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const isProd = process.env.NODE_ENV === "production";

/**
 * כותרות אבטחה (SEC-M-02 / SEC-A-04).
 *
 * CSP מפוצל לשניים:
 *  1. ENFORCED — תת-קבוצה בטוחה שלא יכולה לשבור סקריפטים: frame-ancestors / base-uri / object-src.
 *     (frame-ancestors 'self' ולא 'none': Live Preview של Payload מטמיע את האתר ב-iframe באותו origin.)
 *  2. REPORT-ONLY — מדיניות מלאה (default-src/script-src/...). נשארת Report-Only כי Next.js מזריק
 *     סקריפטים inline להידרציה ו-Payload admin משתמש ב-inline scripts/styles; CSP מחמיר
 *     דורש nonce דרך proxy.ts (מכריח רינדור דינמי לכל העמודים). עד אז 'unsafe-inline' + ניטור
 *     הפרות בקונסולת הדפדפן. להידוק עתידי: nonce + 'strict-dynamic'.
 *  HSTS רק בפרודקשן (על localhost הוא היה "נדבק" בדפדפן ושובר פרויקטים אחרים על http://localhost).
 */
const cspEnforced = ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"].join("; ");

const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspEnforced },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Docker/Cloud Run בלבד: NEXT_OUTPUT=standalone (מוגדר ב-Dockerfile). ללא המשתנה — בילד רגיל כמו קודם.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Prisma רץ ב-Node ולא צריך להיארז ע"י ה-bundler של השרת
  serverExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
  experimental: {
    // העלאת תוצרים בחדר העבודה עוברת דרך server action (ברירת מחדל 1MB).
    // לפרודקשן עדיף direct-to-blob לקבצים גדולים — ראה src/lib/storage.ts.
    serverActions: { bodySizeLimit: "55mb" },
  },
  // ה-route של הורדת תוסף ה-WooCommerce קורא את ה-ZIP מ-wp-plugin/dist דרך fs;
  // ב-Vercel צריך לצרף אותו ל-serverless function של ה-route.
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // API + פאנל הניהול לא לאינדוקס
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // מדיה שהועלתה ב-CMS: sandbox — גם אם משהו מסוכן הועלה, לא רץ בהקשר האתר
      {
        source: "/api/media/file/:path*",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; sandbox" }],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/plugin-download": ["./wp-plugin/dist/**"],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
