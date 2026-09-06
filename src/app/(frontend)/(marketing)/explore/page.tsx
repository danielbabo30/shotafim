import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "אינדקס עסקים | BridgeAd",
  description: "אינדקס עסקים ציבורי של BridgeAd.",
};

// עמוד ציבורי — placeholder. הפיצ'ר הועבר לאזור האישי (/dashboard/businesses);
// אינדקס ציבורי יגיע בשלב עתידי.
export default function ExplorePage() {
  return (
    <Container className="flex flex-col gap-4 py-12">
      <h1 className="text-on-surface text-3xl font-bold">אינדקס עסקים</h1>
      <p className="text-on-surface-variant">
        אינדקס העסקים הציבורי יגיע בעתיד. בינתיים, משתמשים רשומים יכולים לחפש עסקים דרך האזור האישי.
      </p>
    </Container>
  );
}
