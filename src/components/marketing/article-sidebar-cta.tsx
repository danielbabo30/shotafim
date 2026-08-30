import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@/components/marketing/icons";

/** כרטיס CTA דביק בסרגל הצד של המאמר. תוכן קבוע — עידוד הרשמה. */
export function ArticleSidebarCta({
  heading = "רוצה להבטיח את תקציב הקמפיין הבא שלך?",
  body = "ארנק הנאמנות שלנו נועל את התקציב מראש ומשחרר אותו רק על תוצאות מאומתות.",
  ctaLabel = "התחלה חינם",
  ctaHref = "/sign-in",
}: {
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="bg-inverse-surface text-inverse-on-surface sticky top-24 flex flex-col items-center gap-4 rounded-xl p-6 text-center">
      <span className="bg-primary/25 text-primary-fixed flex size-11 items-center justify-center rounded-full">
        <ShieldCheckIcon className="size-6" />
      </span>
      <p className="text-lg font-bold">{heading}</p>
      <p className="text-sm opacity-80">{body}</p>
      <Button href={ctaHref} size="lg" className="w-full">
        {ctaLabel}
      </Button>
    </div>
  );
}
