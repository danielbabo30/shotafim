import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/login — כניסה מהירה כמשתמש-בדיקה מקומי, בלי ספק כניסה חיצוני.
 * יוצר משתמש + רשומת Session, ומגדיר את עוגיית ה-session של Auth.js
 * (אסטרטגיית database → ערך העוגייה הוא ה-sessionToken עצמו).
 *
 * פיתוח בלבד. יש להסיר את הקובץ לפני עלייה לפרודקשן.
 *
 * פרמטרים אופציונליים:
 *   ?role=brand|creator|space|admin  — הכובע הפעיל ההתחלתי (ברירת מחדל: brand)
 *   ?next=/some/path                 — יעד ההפניה (ברירת מחדל: /dashboard)
 *   ?pending=1                       — יוצר משתמש PENDING_ONBOARDING נקי (בלי תפקידים/פרופיל)
 *                                      לבדיקת זרימת ההרשמה. next ברירת מחדל: /register/roles
 *   ?email=someone@demo...           — כניסה כמשתמש קיים לפי מייל (למשל משתמשי הדמו). לא יוצר משתמש.
 */

const DEV_EMAIL = "dev@bridgead.local";
const PENDING_EMAIL = "dev-pending@bridgead.local";
const SESSION_DAYS = 30;

const ROLE_MAP: Record<string, "BRAND" | "CREATOR" | "AD_SPACE_OWNER" | "ADMIN"> = {
  brand: "BRAND",
  creator: "CREATOR",
  space: "AD_SPACE_OWNER",
  admin: "ADMIN",
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const pending = params.get("pending") === "1";
  const asEmail = params.get("email")?.trim().toLowerCase() || null;
  const activeRole = ROLE_MAP[params.get("role") ?? "brand"] ?? "BRAND";
  const next = params.get("next") ?? (pending ? "/register/roles" : "/dashboard");

  try {
    const now = new Date();

    // מוחקים משתמש-הרשמה קודם כדי שכל בדיקה תתחיל מדף חלק
    if (pending) {
      await prisma.user.deleteMany({ where: { email: PENDING_EMAIL } });
    }

    let user;
    if (asEmail) {
      user = await prisma.user.findUnique({ where: { email: asEmail } });
      if (!user) {
        return NextResponse.json(
          { ok: false, error: `אין משתמש עם המייל ${asEmail}` },
          { status: 404 },
        );
      }
    } else {
      user = pending
        ? await prisma.user.create({
            data: {
              email: PENDING_EMAIL,
              emailVerified: now,
              status: "PENDING_ONBOARDING",
              roles: [],
            },
          })
        : await prisma.user.upsert({
            where: { email: DEV_EMAIL },
            create: {
              email: DEV_EMAIL,
              name: "משתמש בדיקה",
              emailVerified: now,
              status: "ACTIVE",
              roles: ["BRAND", "CREATOR", "AD_SPACE_OWNER", "ADMIN"],
              activeRole,
              termsAcceptedAt: now,
              lastLoginAt: now,
            },
            update: {
              status: "ACTIVE",
              roles: { set: ["BRAND", "CREATOR", "AD_SPACE_OWNER", "ADMIN"] },
              activeRole,
              termsAcceptedAt: now,
              lastLoginAt: now,
              deletedAt: null,
            },
          });
    }

    const sessionToken = crypto.randomUUID();
    const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

    // Auth.js משתמש בשם עוגייה עם קידומת __Secure- כש-useSecureCookies פעיל (https/production) —
    // חייבים להתאים כדי ש-auth() יזהה את העוגייה שנוצרה כאן (ראה src/auth.ts, אין קונפיג cookies
    // מפורש שם, אז ההתנהגות היא ברירת המחדל של הספרייה לפי סכמת ה-URL).
    const isSecure = request.nextUrl.protocol === "https:";
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      expires,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
