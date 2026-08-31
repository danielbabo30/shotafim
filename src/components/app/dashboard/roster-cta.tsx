import Link from "next/link";
import { UsersIcon } from "@/components/marketing/icons";

/** תיבת פעולה — הזמנת יוצרים לרוסטר המפרסם */
export function RosterCta() {
  return (
    <section className="from-primary-fixed to-surface-high border-primary-fixed relative overflow-hidden rounded-xl border bg-gradient-to-br p-5">
      <UsersIcon
        className="text-on-primary-fixed pointer-events-none absolute -start-4 -bottom-4 size-28 opacity-10"
        aria-hidden
      />
      <h3 className="font-display text-on-primary-fixed relative mb-2 text-xl font-bold">
        הזמינו יוצרים לרוסטר שלכם
      </h3>
      <p className="text-on-surface-variant relative mb-4 text-sm">
        בנו מאגר יוצרים מועדפים לגישה מהירה בקמפיינים עתידיים.
      </p>
      <Link
        href="/dashboard/roster/invite"
        className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm relative inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
      >
        <UsersIcon className="size-4" />
        הזמנה עכשיו
      </Link>
    </section>
  );
}
