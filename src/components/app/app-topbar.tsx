import Link from "next/link";
import { BellIcon } from "@/components/marketing/icons";
import { MobileSidebar } from "@/components/app/mobile-sidebar";
import { RoleSwitcher } from "@/components/app/role-switcher";
import { UserMenu } from "@/components/app/user-menu";
import type { AppUser } from "@/lib/app-user";

/** סרגל עליון של האזור האישי */
export function AppTopbar({ siteName, user }: { siteName: string; user: AppUser }) {
  return (
    <header className="border-outline-variant bg-surface-lowest/95 sticky top-0 z-40 h-16 border-b backdrop-blur">
      <div className="mx-auto flex h-full max-w-[var(--container-site)] items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileSidebar siteName={siteName} activeRole={user.activeRole} />
          <Link href="/dashboard" className="text-primary font-display text-lg font-bold lg:hidden">
            {siteName}
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <RoleSwitcher roleKeys={user.roleKeys} activeRole={user.activeRole} />
          <Link
            href="/dashboard/notifications"
            aria-label="התראות"
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition-colors"
          >
            <BellIcon className="size-5" />
          </Link>
          <UserMenu name={user.name} email={user.email} image={user.image} />
        </div>
      </div>
    </header>
  );
}
