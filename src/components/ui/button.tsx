import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded font-semibold transition-all " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Primary — Electric Indigo מלא, טקסט לבן
  primary:
    "bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0",
  // Ghost — שקוף עם מסגרת 1px
  ghost:
    "border border-outline-variant text-on-surface hover:bg-surface-container hover:border-outline",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-sm", // 40px
  lg: "h-12 px-6 text-base", // 48px — CTA
};

type ButtonAsButton = ComponentProps<"button"> & { href?: undefined };
type ButtonAsLink = ComponentProps<typeof Link> & { href: string };

type Props = (ButtonAsButton | ButtonAsLink) & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: Props) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (typeof props.href === "string") {
    return <Link className={classes} {...(props as ButtonAsLink)} />;
  }
  return <button className={classes} {...(props as ButtonAsButton)} />;
}
