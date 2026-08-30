"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import type { MainNavigation, SiteSetting } from "@/payload-types";

type Items = NonNullable<MainNavigation["items"]>;
type AuthConfig = NonNullable<SiteSetting["auth"]>;

export function SiteNav({ items, auth }: { items: Items; auth: AuthConfig }) {
  return (
    <>
      <DesktopNav items={items} />
      <MobileNav items={items} auth={auth} />
    </>
  );
}

/* ─────────── דסקטופ ─────────── */

function DesktopNav({ items }: { items: Items }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-8 md:flex">
      {items.map((item, i) => {
        const isDropdown = item.type === "dropdown" && item.children?.length;
        if (!isDropdown) {
          return (
            <NavLink key={i} href={item.href || "#"} active={pathname === item.href}>
              {item.label}
            </NavLink>
          );
        }
        return <Dropdown key={i} item={item} pathname={pathname} />;
      })}
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "hover:text-primary text-sm font-semibold transition-colors",
        active ? "text-primary" : "text-on-surface-variant",
      )}
    >
      {children}
    </Link>
  );
}

function Dropdown({ item, pathname }: { item: Items[number]; pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="hover:text-primary text-on-surface-variant flex items-center gap-1 text-sm font-semibold transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {item.label}
        <Chevron className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute end-0 top-full pt-3">
          <div className="border-outline-variant bg-surface-lowest shadow-ambient min-w-64 rounded-lg border p-2">
            {item.children?.map((child, i) => (
              <Link
                key={i}
                href={child.href}
                className={cn(
                  "hover:bg-surface-container block rounded-md px-3 py-2 transition-colors",
                  pathname === child.href && "bg-surface-container",
                )}
              >
                <span className="block text-sm font-semibold">{child.label}</span>
                {child.description && (
                  <span className="text-on-surface-variant mt-0.5 block text-xs">
                    {child.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── מובייל ─────────── */

function MobileNav({ items, auth }: { items: Items; auth: AuthConfig }) {
  const [open, setOpen] = useState(false);

  // נעילת גלילת הרקע כשהתפריט פתוח
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlay = open ? (
    // portal ל-body — כדי לא להיתקל ב-backdrop-filter של ה-header שכולא position:fixed
    <div className="fixed inset-0 z-[100] md:hidden">
      <div className="bg-on-surface/40 absolute inset-0" onClick={() => setOpen(false)} />
      <div className="bg-surface-lowest shadow-ambient-lg absolute inset-y-0 end-0 flex w-80 max-w-[85%] flex-col p-6">
        <button
          type="button"
          aria-label="סגירה"
          onClick={() => setOpen(false)}
          className="hover:bg-surface-container -me-2 self-end rounded p-2"
        >
          <X className="size-6" />
        </button>

        <nav className="mt-4 flex flex-col gap-1">
          {items.map((item, i) => (
            <MobileItem key={i} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button href={auth.loginUrl} variant="ghost" size="lg">
            {auth.loginLabel}
          </Button>
          <Button href={auth.signupUrl} variant="primary" size="lg">
            {auth.signupLabel}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="תפריט"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-container -me-2 rounded p-2"
      >
        <Bars className="size-6" />
      </button>
      {overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </div>
  );
}

function MobileItem({ item, onNavigate }: { item: Items[number]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.type === "dropdown" && item.children?.length;

  if (!hasChildren) {
    return (
      <Link
        href={item.href || "#"}
        onClick={onNavigate}
        className="hover:bg-surface-container rounded-md px-3 py-2.5 text-sm font-semibold"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-surface-container flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold"
        aria-expanded={open}
      >
        {item.label}
        <Chevron className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-outline-variant ms-3 flex flex-col border-s ps-3">
          {item.children?.map((child, i) => (
            <Link
              key={i}
              href={child.href}
              onClick={onNavigate}
              className="hover:bg-surface-container text-on-surface-variant rounded-md px-3 py-2 text-sm"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── אייקונים ─────────── */

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Bars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function X({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
