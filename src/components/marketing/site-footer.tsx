import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/marketing/logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { getShellData } from "@/lib/cms";

export async function SiteFooter() {
  const { siteName, logo, footer } = await getShellData();

  return (
    <footer className="border-outline-variant bg-surface-low mt-auto border-t">
      <Container className="py-16">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* מיתוג */}
          <div>
            <Logo siteName={siteName} logo={logo} size="sm" className="mb-5" />
            <p className="text-on-surface-variant text-sm leading-relaxed">{footer.tagline}</p>
          </div>

          {/* עמודות קישורים */}
          {footer.columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-display text-on-surface mb-5 text-xs font-bold tracking-wider uppercase">
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links?.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className="text-on-surface-variant hover:text-primary text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ניוזלטר */}
          <NewsletterForm newsletter={footer.newsletter} />
        </div>

        {/* שורה תחתונה */}
        <div className="border-outline-variant flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-on-surface-variant text-xs">
            © {new Date().getFullYear()} {footer.copyrightHolder}. כל הזכויות שמורות.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {footer.legalLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-on-surface-variant hover:text-primary text-xs transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
