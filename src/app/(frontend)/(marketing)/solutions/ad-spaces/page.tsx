import type { Metadata } from "next";
import { SolutionHero } from "@/components/marketing/solution-hero";
import { StatsBar } from "@/components/marketing/stats-bar";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { WorkflowStepper } from "@/components/marketing/workflow-stepper";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { getSolutionsAdSpacesData } from "@/lib/solutions-ad-spaces";

export const metadata: Metadata = {
  title: "פתרונות לבעלי שטחי פרסום",
  description:
    "בעלי שלטי חוצות, מסכי LED, ניוזלטרים ופודקאסטים — נהלו תפוסה, שבצו קמפיינים והפכו שטחים פנויים להכנסה קבועה, עם אימות חשיפה ותשלום מאובטח.",
};

export default async function SolutionsAdSpacesPage() {
  const data = await getSolutionsAdSpacesData();

  return (
    <>
      <SolutionHero
        badge={data.hero.badge}
        headingLead={data.hero.headingLead}
        headingHighlight={data.hero.headingHighlight}
        headingTail={data.hero.headingTail}
        body={data.hero.body}
        primaryCta={data.hero.primaryCta}
        secondaryCta={data.hero.secondaryCta}
      />
      <StatsBar stats={data.stats ?? []} />
      <FeatureShowcase showcase={data.showcase} />
      <WorkflowStepper workflow={data.workflow} />
      <CtaBanner
        headingLead={data.cta.headingLead}
        headingTail={data.cta.headingTail}
        body={data.cta.body}
        action={data.cta.action}
      />
    </>
  );
}
