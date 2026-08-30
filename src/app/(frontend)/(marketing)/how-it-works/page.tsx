import type { Metadata } from "next";
import { HowItWorksHero } from "@/components/marketing/how-it-works-hero";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { ComparisonCards } from "@/components/marketing/comparison-cards";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { getHowItWorksData } from "@/lib/how-it-works";

export const metadata: Metadata = {
  title: "איך זה עובד",
  description:
    "תהליך העבודה המאובטח שלנו — מהפקדת התקציב לארנק הנאמנות ועד לשחרור התשלום האוטומטי והפקת חשבונית מס דיגיטלית.",
};

export default async function HowItWorksPage() {
  const data = await getHowItWorksData();

  return (
    <>
      <HowItWorksHero hero={data.hero} />
      <ProcessTimeline timeline={data.timeline} />
      <ComparisonCards comparison={data.comparison} />
      <FaqAccordion faq={data.faq} />
    </>
  );
}
