import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Prisma רץ ב-Node ולא צריך להיארז ע"י ה-bundler של השרת
  serverExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
  experimental: {
    // העלאת תוצרים בחדר העבודה עוברת דרך server action (ברירת מחדל 1MB).
    // לפרודקשן עדיף direct-to-blob לקבצים גדולים — ראה src/lib/storage.ts.
    serverActions: { bodySizeLimit: "55mb" },
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
