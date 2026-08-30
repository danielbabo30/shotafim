/** קונפיגורציה כללית של האתר — מקום אחד לשם, תיאור, קישורים */
export const site = {
  name: "שותפים",
  shortName: "שותפים",
  description: "פלטפורמה לחיבור בין שותפים עסקיים וניהול שיתופי פעולה.",
  url: process.env.AUTH_URL ?? "http://localhost:3000",
  locale: "he_IL",
  nav: [
    { href: "/", label: "בית" },
    { href: "/explore", label: "אינדקס" },
  ],
} as const;
