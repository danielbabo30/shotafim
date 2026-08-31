import Link from "next/link";
import { NavLink } from "@/components/app/nav-link";
import { NavIcon } from "@/components/app/nav-icon";
import { LogoutIcon } from "@/components/marketing/icons";
import { signOutAction } from "@/lib/actions/app-actions";
import { FOOTER_NAV, ROLE_META, type RoleKey } from "@/lib/app-nav";

/**
 * גוף הסייד-בר — משותף למגירה במובייל ולעמודה הקבועה בדסקטופ.
 * מקבל את התפקיד הפעיל ובונה ממנו CTA + ניווט.
 */
export function SidebarContent({
  siteName,
  activeRole,
  onNavigate,
}: {
  siteName: string;
  activeRole: RoleKey;
  /** נמסר רק מהמגירה במובייל — לסגירה בעת ניווט */
  onNavigate?: () => void;
}) {
  const role = ROLE_META[activeRole];

  return (
    <div className="flex h-full flex-col">
      {/* זהות + CTA */}
      <div className="border-outline-variant flex flex-col gap-4 border-b p-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <span className="bg-primary text-on-primary font-display grid size-10 place-items-center rounded-lg text-lg font-bold">
            {siteName.charAt(0)}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-on-surface font-display text-base font-bold">{siteName}</span>
            <span className="text-on-surface-variant text-xs">{role.tagline}</span>
          </span>
        </Link>

        {role.cta && (
          <Link
            href={role.cta.href}
            onClick={onNavigate}
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <NavIcon name={role.cta.icon} className="size-4" />
            {role.cta.label}
          </Link>
        )}
      </div>

      {/* ניווט ראשי */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {role.nav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* ניווט תחתון + יציאה */}
      <div className="border-outline-variant flex flex-col gap-1 border-t p-3">
        {FOOTER_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-on-surface-variant hover:bg-error-container hover:text-on-error-container flex w-full items-center gap-3 rounded-lg border-s-4 border-transparent px-3 py-2 text-sm font-medium transition-colors"
          >
            <LogoutIcon className="size-5 shrink-0" />
            <span>התנתקות</span>
          </button>
        </form>
      </div>
    </div>
  );
}
