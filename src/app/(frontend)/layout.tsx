import type { Metadata } from "next";
import type { ReactNode } from "react";
import { assistant, heebo } from "@/lib/fonts";
import "./globals.css";
import { site } from "@/lib/site";

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
