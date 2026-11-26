import type { ReactNode } from "react";
import { SkipLink } from "@/components/ui/skip-link";
import { SiteHeader } from "@/components/marketing/site-header";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { SiteFooter } from "@/components/marketing/site-footer";

// ISR — שינויים ב-CMS מופיעים תוך דקה בלי דיפלוי מחדש.
// בהמשך: on-demand revalidation דרך hook ב-Payload.
export const revalidate = 60;

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CookieConsent />
    </>
  );
}
