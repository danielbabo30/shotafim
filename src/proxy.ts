import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (לשעבר Middleware — שונה השם ב-Next.js 16).
 *
 * זו בדיקה "אופטימית" בלבד: אם אין עוגיית session, מפנים ל-sign-in
 * לפני שבכלל טוענים את העמוד. האימות האמיתי מול ה-DB נעשה ב-(app)/layout.tsx
 * דרך auth(). ראה: docs — "optimistic checks with Proxy".
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  // שלבי ההרשמה שאחרי יצירת החשבון — דורשים session. "/register" עצמו נשאר ציבורי.
  "/register/roles",
  "/register/profile",
  "/register/complete",
];

// שמות עוגיית ה-session של Auth.js v5 (dev / production)
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // רץ על הכל חוץ מ: API, פאנל הניהול של Payload, נכסים סטטיים
  matcher: [
    "/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
