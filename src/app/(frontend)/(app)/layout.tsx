import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { site } from "@/lib/site";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // אימות אמיתי מול ה-DB (ה-proxy עושה רק בדיקה אופטימית)
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-bold">
            {site.name} · האזור האישי
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-black/60 dark:text-white/60">
              {session.user.name ?? session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="hover:underline">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
