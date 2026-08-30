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
  trustHost: true,
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in?check=email",
    error: "/sign-in",
  },
  providers,
  callbacks: {
    /** מוסיף id ותפקיד לאובייקט ה-session שנחשף ללקוח ולשרת */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
});
