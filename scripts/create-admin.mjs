// יוצר/מקדם משתמש פלטפורמה לאדמין (User.roles כולל ADMIN). לא כותב ולא מקבל סיסמאות —
// הכניסה היא דרך קישור במייל (Resend) או Google, לפי המייל הזה.
//
// שימוש (מהמחשב שלך, מול בסיס הנתונים שמוגדר ב-DATABASE_URL):
//   DATABASE_URL="..." DIRECT_URL="..." node scripts/create-admin.mjs you@example.com
//
// בטוח להרצה חוזרת: אם המשתמש קיים — מוסיף ADMIN לתפקידים הקיימים ולא משנה דבר אחר.

import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("שימוש: node scripts/create-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const roles = Array.from(new Set([...existing.roles, "ADMIN"]));
    await prisma.user.update({
      where: { id: existing.id },
      data: { roles: { set: roles }, status: "ACTIVE", deletedAt: null },
    });
    console.log(`עודכן: ${email} — תפקידים: ${roles.join(", ")}`);
  } else {
    await prisma.user.create({
      data: { email, roles: ["ADMIN"], activeRole: "ADMIN", status: "ACTIVE" },
    });
    console.log(`נוצר אדמין: ${email}. היכנס עם קישור במייל / Google באתר.`);
  }
} finally {
  await prisma.$disconnect();
}
