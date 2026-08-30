import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ContactForm } from "@/components/marketing/contact-form";
import { ContactInfo } from "@/components/marketing/contact-info";
import { getContactData } from "@/lib/contact";
import { getCompanyInfo } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "צור קשר",
  description:
    "יש לכם שאלה על הפלטפורמה, רעיון לשיתוף פעולה או צורך בתמיכה? שלחו לנו פנייה ונחזור אליכם בהקדם.",
};

export default async function ContactPage() {
  const [{ hero, form, details }, company] = await Promise.all([
    getContactData(),
    getCompanyInfo(),
  ]);

  return (
    <Container className="py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-balance sm:text-5xl">
          {hero.headingLead}
          <span className="from-primary to-primary-container bg-gradient-to-l bg-clip-text text-transparent">
            {hero.headingHighlight}
          </span>
          {hero.headingTail ? ` ${hero.headingTail}` : null}
        </h1>
        <p className="text-on-surface-variant mt-4 text-lg leading-relaxed">{hero.body}</p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ContactForm form={form} />
        </div>
        <div className="lg:col-span-2">
          <ContactInfo company={company} heading={details.heading} note={details.note} />
        </div>
      </div>
    </Container>
  );
}
