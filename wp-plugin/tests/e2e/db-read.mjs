// קריאה בלבד (e2e-wp-test). שימוש: node wp-plugin/tests/e2e/db-read.mjs <cmd>
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const cmd = process.argv[2] ?? "sites";
if (cmd === "all-programs") {
  console.log(
    JSON.stringify(
      await p.partnerProgram.findMany({
        select: {
          id: true,
          refCode: true,
          status: true,
          couponCode: true,
          destinationUrl: true,
          contract: { select: { businessId: true } },
        },
      }),
      null,
      1,
    ),
  );
  process.exit(0);
}
const out = (x) => console.log(JSON.stringify(x, null, 2));
if (cmd === "programs") {
  out(
    await p.partnerProgram.findMany({
      where: { contract: { businessId: process.argv[3] } },
      select: {
        id: true,
        refCode: true,
        status: true,
        couponCode: true,
        couponDiscountPct: true,
        attributionMode: true,
        destinationUrl: true,
        commissionType: true,
        commissionValue: true,
      },
    }),
  );
} else if (cmd === "sites") {
  out(await p.trackedSite.findMany({ where: { siteUrl: { contains: "e2e-wp-test" } } }));
} else if (cmd === "clicks") {
  out(
    await p.affiliateClick.findMany({
      where: {
        program: { refCode: process.argv[3] ?? "BGSEED10WI" },
        createdAt: { gte: new Date(process.argv[4] ?? Date.now() - 36e5) },
      },
      orderBy: { createdAt: "asc" },
    }),
  );
} else if (cmd === "orders") {
  out(
    await p.attributedOrder.findMany({
      where: {
        program: { refCode: process.argv[3] ?? "BGSEED10WI" },
        createdAt: { gte: new Date(process.argv[4] ?? Date.now() - 36e5) },
      },
      orderBy: { createdAt: "asc" },
    }),
  );
}
await p.$disconnect();
