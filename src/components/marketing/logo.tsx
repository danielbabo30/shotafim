import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Media } from "@/payload-types";

/**
 * לוגו האתר. אם הוגדר קובץ לוגו ב-CMS — מציג אותו.
 * אחרת — מציג סימן ברירת מחדל + שם האתר.
 */
export function Logo({
  siteName,
  logo,
  className,
  size = "md",
}: {
  siteName: string;
  logo: Media | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? 28 : 36;
  const ratio = logo?.width && logo?.height ? logo.width / logo.height : 4;

  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={siteName}
    >
      {logo?.url ? (
        <Image
          src={logo.url}
          alt={logo.alt || siteName}
          width={Math.round(h * ratio)}
          height={h}
          priority
          className="w-auto"
          style={{ height: h }}
        />
      ) : (
        <>
          <span
            className="bg-primary text-on-primary flex items-center justify-center rounded"
            style={{ width: h, height: h }}
            aria-hidden
          >
            <BridgeMark className={size === "sm" ? "size-4" : "size-5"} />
          </span>
          <span
            className={cn(
              "font-display font-extrabold tracking-tight",
              size === "sm" ? "text-lg" : "text-xl",
            )}
          >
            {siteName}
          </span>
        </>
      )}
    </Link>
  );
}

function BridgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 18c0-5 4-9 9-9s9 4 9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M8 18l4-9 4 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
