// Seed לנתוני עזר של Prisma (schema public). מריצים: `npx prisma db seed`.
// כרגע: טבלת City בלבד (קטגוריות הדומיין נזרעות דרך Payload — GET /dev/seed).
// upsert לפי nameHe — הרצה חוזרת מעדכנת ולא משכפלת.

import { PrismaClient } from "@prisma/client";
import { ISRAEL_LOCALITIES } from "./seed/israel-localities.mjs";

const prisma = new PrismaClient();

async function seedCities() {
  for (const [i, loc] of ISRAEL_LOCALITIES.entries()) {
    const data = {
      nameEn: loc.nameEn || null,
      district: loc.district,
      sortOrder: i,
      isActive: true,
    };
    await prisma.city.upsert({
      where: { nameHe: loc.nameHe },
      create: { nameHe: loc.nameHe, ...data },
      update: data,
    });
  }
  const total = await prisma.city.count();
  console.log(
    `City seed done — ${ISRAEL_LOCALITIES.length} localities processed, ${total} rows in table.`,
  );
}

seedCities()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
