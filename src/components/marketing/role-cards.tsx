import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import {
  ArrowIcon,
  CheckIcon,
  GridIcon,
  InventoryIcon,
  MegaphoneIcon,
  PriceTagIcon,
  StorefrontIcon,
} from "@/components/marketing/icons";
import type { Homepage } from "@/payload-types";

type Props = {
  heading: string;
  subheading?: string | null;
  brand: Homepage["brandCard"];
  influencer: Homepage["influencerCard"];
  space: Homepage["spaceCard"];
};

/** מקטע "תוכנן לכל שותף" — bento grid עם שלושה כרטיסי תפקיד. */
export function RoleCards({ heading, subheading, brand, influencer, space }: Props) {
  return (
    <section>
      <Container className="py-20">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="text-on-surface-variant mt-3 text-base leading-relaxed">{subheading}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* מותגים — רחב */}
          <article className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient relative flex flex-col overflow-hidden rounded-xl border p-8 transition-shadow md:col-span-8">
            <div className="bg-primary/5 absolute -end-24 -bottom-24 size-64 rounded-full blur-2xl" />
            <div className="relative flex flex-1 flex-col">
              <IconBadge className="from-primary-container to-primary text-on-primary bg-gradient-to-br">
                <StorefrontIcon className="size-6" />
              </IconBadge>
              <h3 className="mt-6 text-2xl font-bold">{brand.title}</h3>
              <p className="text-on-surface-variant mt-3 max-w-lg text-base leading-relaxed">
                {brand.body}
              </p>

              {brand.features?.length ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {brand.features.map((f, i) => (
                    <li key={f.id ?? i} className="flex items-center gap-3 text-sm font-medium">
                      <span className="bg-success-container text-success flex size-6 shrink-0 items-center justify-center rounded-full">
                        <CheckIcon className="size-3.5" />
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              ) : null}

              {brand.cta?.href && (
                <div className="mt-auto pt-6">
                  <CardLink href={brand.cta.href} variant="outline">
                    {brand.cta.label}
                  </CardLink>
                </div>
              )}
            </div>
          </article>

          {/* משפיענים — צר */}
          <article className="border-outline-variant/40 from-surface-lowest to-surface-low shadow-ambient-sm hover:shadow-ambient relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-b p-8 transition-shadow md:col-span-4">
            {influencer.badge && (
              <span className="bg-primary-fixed text-on-primary-fixed absolute end-6 top-6 rounded-full px-3 py-1 text-xs font-bold">
                {influencer.badge}
              </span>
            )}
            <IconBadge className="bg-primary-fixed text-primary">
              <MegaphoneIcon className="size-6" />
            </IconBadge>
            <h3 className="mt-6 text-xl font-bold">{influencer.title}</h3>
            <p className="text-on-surface-variant mt-3 text-sm leading-relaxed">
              {influencer.body}
            </p>

            {influencer.features?.length ? (
              <ul className="mt-6 space-y-3">
                {influencer.features.map((f, i) => (
                  <li key={f.id ?? i} className="flex items-center gap-2 text-sm font-medium">
                    <CheckIcon className="text-primary size-4 shrink-0" />
                    {f.text}
                  </li>
                ))}
              </ul>
            ) : null}

            {influencer.cta?.href && (
              <div className="mt-auto pt-6">
                <CardLink href={influencer.cta.href} variant="text">
                  {influencer.cta.label}
                </CardLink>
              </div>
            )}
          </article>

          {/* בעלי שטחים — רצועה מלאה */}
          <article className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient flex flex-col items-center gap-6 rounded-xl border p-8 transition-shadow md:col-span-12 md:flex-row">
            <div className="bg-surface-container text-on-surface flex size-14 shrink-0 items-center justify-center rounded-xl">
              <GridIcon className="size-7" />
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className="text-xl font-bold">{space.title}</h3>
              <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
                {space.body}
              </p>
            </div>
            {space.tags?.length ? (
              <div className="flex shrink-0 flex-wrap justify-center gap-3">
                {space.tags.map((t, i) => (
                  <span
                    key={t.id ?? i}
                    className="border-outline-variant/40 bg-surface-low text-on-surface-variant flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
                  >
                    {i === 0 ? (
                      <InventoryIcon className="size-4" />
                    ) : (
                      <PriceTagIcon className="size-4" />
                    )}
                    {t.text}
                  </span>
                ))}
              </div>
            ) : null}
            {space.cta?.href && (
              <div className="shrink-0">
                <Link
                  href={space.cta.href}
                  className="border-primary text-primary hover:bg-primary/5 inline-flex h-12 items-center justify-center rounded-md border-2 px-6 text-sm font-semibold transition-colors"
                >
                  {space.cta.label}
                </Link>
              </div>
            )}
          </article>
        </div>
      </Container>
    </section>
  );
}

function IconBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`flex size-14 items-center justify-center rounded-xl ${className ?? ""}`}>
      {children}
    </span>
  );
}

function CardLink({
  href,
  children,
  variant,
}: {
  href: string;
  children: ReactNode;
  variant: "outline" | "text";
}) {
  if (variant === "outline") {
    return (
      <Link
        href={href}
        className="border-outline-variant/60 bg-surface-lowest text-primary hover:bg-surface-container shadow-ambient-sm inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-semibold transition-colors"
      >
        {children}
        <ArrowIcon className="size-4" />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
    >
      {children}
      <ArrowIcon className="size-4" />
    </Link>
  );
}
