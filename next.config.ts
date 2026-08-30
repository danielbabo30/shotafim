import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Prisma רץ ב-Node ולא צריך להיארז ע"י ה-bundler של השרת
  serverExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
