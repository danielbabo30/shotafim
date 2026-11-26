import type { Metadata } from "next";
import "./(frontend)/globals.css";
import { assistant, heebo } from "@/lib/fonts";
import { SkipLink } from "@/components/ui/skip-link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NotFoundView } from "@/components/marketing/not-found-view";

export const metadata: Metadata = {
  title: "העמוד לא נמצא",
};

/** 404 לכתובות שלא תואמות אף route (יש כמה root layouts, לכן Next דורש קובץ גלובלי) */
export default function GlobalNotFound() {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="bg-background text-on-surface flex min-h-full flex-col font-sans">
        <SkipLink />
        <SiteHeader />
        <main id="main-content" className="flex-1">
          <NotFoundView />
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
