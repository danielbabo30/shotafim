import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { prisma } from "@/lib/prisma";
import { env, hasEmail, hasGoogle } from "@/env";

const providers: NextAuthConfig["providers"] = [];

if (hasGoogle) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID!,
      clientSecret: env.AUTH_GOOGLE_SECRET!,
      // קישור אוטומטי לחשבון קיים לפי מייל — מותר רק כש-Google מאשר את המייל
      // (callbacks.signIn למטה דוחה email_verified !== true). ראה SEC-A-01.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (hasEmail) {
  providers.push(
    Resend({
      apiKey: env.AUTH_RESEND_KEY!,
      from: env.EMAIL_FROM!,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // סומכים על כותרת Host רק כש-AUTH_URL מקובע (או הוגדר AUTH_TRUST_HOST במפורש / רץ על Vercel).
  // ב-production env.ts דורש AUTH_URL. ראה SEC-M-11.
  trustHost: Boolean(env.AUTH_URL) || env.AUTH_TRUST_HOST || Boolean(process.env.VERCEL),
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in?check=email",
    error: "/sign-in",
  },
  providers,
  callbacks: {
    /**
     * SEC-A-01: כניסה עם Google רק למייל מאומת אצל Google — אחרת תוקף עם חשבון
     * Google לא-מאומת על מייל הקורבן היה משתלט על חשבון קיים (pre-hijacking).
     */
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email_verified === true;
      }
      return true;
    },
    /** מוסיף id ותפקיד לאובייקט ה-session שנחשף ללקוח ולשרת */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.roles = user.roles;
        session.user.activeRole = user.activeRole;
      }
      return session;
    },
  },
});
