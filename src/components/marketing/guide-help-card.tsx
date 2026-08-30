import { Button } from "@/components/ui/button";
import { ChatIcon } from "@/components/marketing/icons";

/**
 * כרטיס "צריך עזרה נוספת?" — שני מצבים:
 * `banner` (ממורכז, בתחתית הלובי) · `sidebar` (צר, בסרגל הצד של המדריך).
 */
export function GuideHelpCard({ variant = "banner" }: { variant?: "banner" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <div className="bg-surface-low border-outline-variant/60 rounded-xl border p-6 text-center">
        <span className="bg-primary-fixed text-primary mx-auto flex size-11 items-center justify-center rounded-full">
          <ChatIcon className="size-5" />
        </span>
        <p className="mt-3 font-bold">צריך עזרה נוספת?</p>
        <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
          הצוות שלנו זמין לכל שאלה על התהליך.
        </p>
        <Button href="/contact" variant="ghost" size="md" className="mt-4 w-full">
          פתיחת קריאת שירות
        </Button>
      </div>
    );
  }

  return (
    <section className="bg-inverse-surface text-inverse-on-surface mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl p-8 text-center">
      <span className="bg-primary/25 text-primary-fixed flex size-12 items-center justify-center rounded-full">
        <ChatIcon className="size-6" />
      </span>
      <h2 className="text-2xl font-bold">לא מצאת את מה שחיפשת?</h2>
      <p className="max-w-xl text-sm opacity-80">
        צוות התמיכה שלנו זמין לסייע בכל שאלה טכנית או פיננסית על השימוש במערכת.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button href="/contact" size="lg">
          פנייה לתמיכה
        </Button>
      </div>
    </section>
  );
}
