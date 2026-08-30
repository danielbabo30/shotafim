import { PrismaClient } from "@prisma/client";

/**
 * מופע Prisma יחיד (singleton).
 * ב-dev, Next.js מרענן מודולים ב-hot reload — בלי ה-guard הזה ניצור
 * עשרות חיבורים ל-DB. ב-serverless (Vercel) המופע נשמר בין קריאות באותה lambda.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
