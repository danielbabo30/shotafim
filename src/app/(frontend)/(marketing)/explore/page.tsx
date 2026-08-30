import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "אינדקס",
  description: "אינדקס ציבורי של שותפים.",
};

// עמוד ציבורי — נרנדר בצד שרת (SSG/SSR) לטובת SEO.
export default function ExplorePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">אינדקס</h1>
      <p className="text-black/70 dark:text-white/70">
        כאן יופיע האינדקס הציבורי. התוכן יגיע בשלב הבא, כשנגדיר את מודל הנתונים.
      </p>
    </div>
  );
}
