"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserIcon, SettingsIcon, LogoutIcon } from "@/components/marketing/icons";
import { signOutAction } from "@/lib/actions/app-actions";

/** תפריט המשתמש בטופ-בר — פרטים, הגדרות, יציאה */
export function UserMenu({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="תפריט המשתמש"
        aria-expanded={open}
        className="ring-outline-variant hover:ring-primary grid size-9 place-items-center overflow-hidden rounded-full ring-1 transition-all"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <span className="bg-surface-container text-on-surface-variant grid size-full place-items-center">
            <UserIcon className="size-5" />
          </span>
        )}
      </button>

      {open && (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient absolute end-0 top-full z-50 mt-2 min-w-60 rounded-lg border p-1.5">
          <div className="border-outline-variant mb-1.5 border-b px-2.5 py-2">
            <p className="text-on-surface truncate text-sm font-semibold">{name ?? "משתמש"}</p>
            {email && <p className="text-on-surface-variant truncate text-xs">{email}</p>}
          </div>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="text-on-surface-variant hover:bg-surface-container flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors"
          >
            <SettingsIcon className="size-4" />
            הגדרות חשבון
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-on-surface-variant hover:bg-error-container hover:text-on-error-container flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-start text-sm transition-colors"
            >
              <LogoutIcon className="size-4" />
              התנתקות
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
