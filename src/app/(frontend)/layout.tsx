import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Assistant, Heebo } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

// כותרות ותוויות — טכני ומודרני (תחליף עברי ל-Geist)
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

// טקסט גוף — קריאוּת מקסימלית (תחליף עברי ל-Inter)
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
  },
};

export default function FrontendRootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="bg-background text-on-surface flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
