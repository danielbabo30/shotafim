import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { ContactPage } from "@/payload-types";
import { DEFAULT_CONTACT } from "@/lib/contact-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד "צור קשר".
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type ContactData = Omit<ContactPage, "id" | "updatedAt" | "createdAt">;

export const getContactData = cache(async (): Promise<ContactData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "contact-page",
      depth: 0,
    })) as unknown as ContactPage;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_CONTACT;

    return {
      hero: { ...DEFAULT_CONTACT.hero, ...data.hero },
      form: {
        ...DEFAULT_CONTACT.form,
        ...data.form,
        subjects: data.form?.subjects?.length ? data.form.subjects : DEFAULT_CONTACT.form.subjects,
      },
      details: { ...DEFAULT_CONTACT.details, ...data.details },
    };
  } catch {
    return DEFAULT_CONTACT;
  }
});
