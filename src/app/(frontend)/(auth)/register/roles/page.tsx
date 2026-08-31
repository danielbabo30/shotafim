import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthProgress } from "@/components/auth/auth-progress";
import { RoleSelection } from "@/components/auth/role-selection";
import { HelpIcon, BellIcon } from "@/components/marketing/icons";
import { getRegisterRolesData } from "@/lib/register-roles";
import { getShellData } from "@/lib/cms";
import { requireRegistrationUser } from "@/lib/registration";

export const metadata: Metadata = {
  title: "בחירת תפקיד",
  description: "שלב 2 בהרשמה — בחירת התפקידים שלך במערכת שותפים.",
};

export default async function RegisterRolesPage() {
  const user = await requireRegistrationUser();
  if (user.status === "ACTIVE") redirect("/dashboard");

  const [data, shell] = await Promise.all([getRegisterRolesData(), getShellData()]);

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="border-outline-variant bg-surface-lowest sticky top-0 z-50 flex h-16 items-center justify-between px-4 sm:px-12">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-primary font-display text-lg font-extrabold">
            {shell.siteName}
          </Link>
          <span className="border-outline-variant text-on-surface-variant border-s ps-3 text-sm">
            הגדרת חשבון
          </span>
        </div>
        <div className="text-on-surface-variant hidden items-center gap-1 md:flex">
          <span className="hover:bg-surface-container cursor-pointer rounded-full p-2 transition-colors">
            <HelpIcon className="size-5" />
          </span>
          <span className="hover:bg-surface-container cursor-pointer rounded-full p-2 transition-colors">
            <BellIcon className="size-5" />
          </span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-12 pb-32">
        <AuthProgress step={2} total={3} label="בחירת תפקיד במערכת" center />

        <header className="mb-12 text-center">
          <h1 className="text-on-surface mb-3 text-3xl font-semibold">{data.heading}</h1>
          <p className="text-on-surface-variant mx-auto max-w-2xl text-base leading-relaxed">
            {data.subheading}
          </p>
        </header>

        <RoleSelection
          brand={data.brandRole}
          creator={data.creatorRole}
          space={data.spaceRole}
          initialSelected={user.roleKeys}
        />
      </main>
    </div>
  );
}
