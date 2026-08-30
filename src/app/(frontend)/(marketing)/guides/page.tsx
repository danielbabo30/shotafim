import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { GuideHero } from "@/components/marketing/guide-hero";
import { GuideExplorer } from "@/components/marketing/guide-explorer";
import { GuidePopularRow } from "@/components/marketing/guide-popular-row";
import { GuideHelpCard } from "@/components/marketing/guide-help-card";
import { getGuidesByCategory, getPopularGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "מרכז העזרה והמדריכים",
  description:
    "כל מה שצריך לדעת על שימוש במערכת — פתיחת חשבון ואימות, ניהול תקציב וארנק נאמנות, אישור חומרי מדיה, מחלוקות וחשבוניות.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesLobbyPage() {
  const [groups, popular] = await Promise.all([getGuidesByCategory(), getPopularGuides()]);

  return (
    <>
      <GuideHero
        heading="מרכז העזרה והמדריכים"
        subheading="כל מה שצריך לדעת על שימוש במערכת, תשלומים מוגנים וניהול קמפיינים."
      />

      <Container className="space-y-16 py-12">
        <GuideExplorer groups={groups} />
        <GuidePopularRow guides={popular} />
        <GuideHelpCard variant="banner" />
      </Container>
    </>
  );
}
