import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPayloadClient } from "@/lib/payload";
import {
  DEFAULT_AUTH,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_TAGLINE,
  DEFAULT_LEGAL_LINKS,
  DEFAULT_NAV_ITEMS,
  DEFAULT_NEWSLETTER,
  DEFAULT_SITE_NAME,
} from "@/lib/cms-defaults";
import { DEFAULT_HOMEPAGE } from "@/lib/homepage-defaults";
import { DEFAULT_HOW_IT_WORKS } from "@/lib/how-it-works-defaults";
import { DEFAULT_AUTH_PANEL } from "@/lib/auth-panel-defaults";
import { DEFAULT_REGISTER_ROLES } from "@/lib/register-roles-defaults";
import { DEFAULT_SOLUTIONS_CREATORS } from "@/lib/solutions-creators-defaults";
import { DEFAULT_SOLUTIONS_BRANDS } from "@/lib/solutions-brands-defaults";
import { DEFAULT_SOLUTIONS_AD_SPACES } from "@/lib/solutions-ad-spaces-defaults";
import { DEFAULT_CONTACT } from "@/lib/contact-defaults";
import { DEFAULT_COMPANY_INFO } from "@/lib/company-info-defaults";
import { DEFAULT_POSTS } from "@/lib/posts-defaults";
import { GUIDE_SEEDS } from "@/lib/guides-defaults";
import { LEGAL_SEEDS } from "@/lib/legal-defaults";
import { PARTNER_CATEGORY_SEEDS } from "@/lib/partner-categories-defaults";

/**
 * זריעת תוכן ברירת מחדל למעטפת: לוגו + הגדרות אתר + תפריט ניווט.
 * לא נוגע במשתמשי CMS — את המשתמש הראשון יוצרים דרך /admin.
 * מריצים דרך GET /dev/seed (פיתוח בלבד).
 */
export async function runSeed() {
  const payload = await getPayloadClient();
  const log: string[] = [];

  // 1. לוגו — רק אם עדיין אין קובץ בשם הזה
  const existing = await payload.find({
    collection: "media",
    where: { filename: { equals: "default-logo.jpeg" } },
    limit: 1,
  });

  let logoId = existing.docs[0]?.id;
  if (!logoId) {
    const filePath = path.join(process.cwd(), "src/seed/default-logo.jpeg");
    const data = await readFile(filePath);
    const media = await payload.create({
      collection: "media",
      data: { alt: DEFAULT_SITE_NAME },
      file: {
        data,
        name: "default-logo.jpeg",
        mimetype: "image/jpeg",
        size: data.byteLength,
      },
    });
    logoId = media.id;
    log.push(`logo uploaded (id ${logoId})`);
  } else {
    log.push(`logo already present (id ${logoId})`);
  }

  // 2. הגדרות אתר
  await payload.updateGlobal({
    slug: "site-settings",
    data: {
      siteName: DEFAULT_SITE_NAME,
      logo: logoId,
      auth: DEFAULT_AUTH,
      footerTagline: DEFAULT_FOOTER_TAGLINE,
      footerColumns: DEFAULT_FOOTER_COLUMNS,
      newsletter: DEFAULT_NEWSLETTER,
      legalLinks: DEFAULT_LEGAL_LINKS,
      copyrightHolder: DEFAULT_SITE_NAME,
    },
  });
  log.push("site-settings seeded");

  // 3. תפריט ניווט
  await payload.updateGlobal({
    slug: "main-navigation",
    data: { items: DEFAULT_NAV_ITEMS },
  });
  log.push("main-navigation seeded");

  // 3b. מידע על החברה — מקור אמת יחיד לפרטי קשר
  await payload.updateGlobal({
    slug: "company-info",
    data: DEFAULT_COMPANY_INFO,
  });
  log.push("company-info seeded");

  // 4. עמוד הבית
  await payload.updateGlobal({
    slug: "homepage",
    data: DEFAULT_HOMEPAGE,
  });
  log.push("homepage seeded");

  // 5. עמוד "איך זה עובד"
  await payload.updateGlobal({
    slug: "how-it-works",
    data: DEFAULT_HOW_IT_WORKS,
  });
  log.push("how-it-works seeded");

  // 5a. פאנל הרשמה / כניסה
  await payload.updateGlobal({
    slug: "auth-panel",
    data: DEFAULT_AUTH_PANEL,
  });
  log.push("auth-panel seeded");

  // 5a2. שלב 2 בהרשמה — בחירת תפקיד
  await payload.updateGlobal({
    slug: "register-roles",
    data: DEFAULT_REGISTER_ROLES,
  });
  log.push("register-roles seeded");

  // 5b. עמוד "פתרונות — ליוצרים"
  await payload.updateGlobal({
    slug: "solutions-creators",
    data: DEFAULT_SOLUTIONS_CREATORS,
  });
  log.push("solutions-creators seeded");

  // 5c. עמוד "פתרונות — לעסקים"
  await payload.updateGlobal({
    slug: "solutions-brands",
    data: DEFAULT_SOLUTIONS_BRANDS,
  });
  log.push("solutions-brands seeded");

  // 5d. עמוד "פתרונות — לבעלי שטחי פרסום"
  await payload.updateGlobal({
    slug: "solutions-ad-spaces",
    data: DEFAULT_SOLUTIONS_AD_SPACES,
  });
  log.push("solutions-ad-spaces seeded");

  // 6. עמוד "צור קשר"
  await payload.updateGlobal({
    slug: "contact-page",
    data: DEFAULT_CONTACT,
  });
  log.push("contact-page seeded");

  // 7. מאמרים — נוצרים פעם אחת; לא דורסים תוכן קיים
  for (const post of DEFAULT_POSTS) {
    const found = await payload.find({
      collection: "posts",
      where: { slug: { equals: post.slug } },
      limit: 1,
    });
    if (found.docs[0]) {
      log.push(`post "${post.slug}" already present`);
      continue;
    }
    await payload.create({ collection: "posts", data: post });
    log.push(`post "${post.slug}" created`);
  }

  // 8. מדריכים — נוצרים פעם אחת; לא דורסים תוכן קיים
  for (const guide of GUIDE_SEEDS) {
    const found = await payload.find({
      collection: "guides",
      where: { slug: { equals: guide.slug } },
      limit: 1,
    });
    if (found.docs[0]) {
      log.push(`guide "${guide.slug}" already present`);
      continue;
    }
    await payload.create({ collection: "guides", data: guide });
    log.push(`guide "${guide.slug}" created`);
  }

  // 9. מסמכים משפטיים — נוצרים פעם אחת; לא דורסים תוכן קיים
  for (const legal of LEGAL_SEEDS) {
    const found = await payload.find({
      collection: "legal-pages",
      where: { slug: { equals: legal.slug } },
      limit: 1,
    });
    if (found.docs[0]) {
      log.push(`legal "${legal.slug}" already present`);
      continue;
    }
    await payload.create({ collection: "legal-pages", data: legal });
    log.push(`legal "${legal.slug}" created`);
  }

  // 10. קטגוריות דומיין — נוצרות פעם אחת; לא דורסות עריכות קיימות
  for (const [i, cat] of PARTNER_CATEGORY_SEEDS.entries()) {
    const found = await payload.find({
      collection: "categories",
      where: { slug: { equals: cat.slug } },
      limit: 1,
    });
    if (found.docs[0]) {
      log.push(`category "${cat.slug}" already present`);
      continue;
    }
    await payload.create({
      collection: "categories",
      data: {
        name: cat.name,
        slug: cat.slug,
        scopes: cat.scopes,
        isActive: true,
        sortOrder: i,
      },
    });
    log.push(`category "${cat.slug}" created`);
  }

  return log;
}
