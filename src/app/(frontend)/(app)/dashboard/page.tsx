import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "דשבורד" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">שלום{user.name ? `, ${user.name}` : ""} 👋</h1>
      <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-black/50 dark:text-white/50">מזהה</dt>
          <dd className="font-mono">{user.id}</dd>
          <dt className="text-black/50 dark:text-white/50">אימייל</dt>
          <dd>{user.email}</dd>
          <dt className="text-black/50 dark:text-white/50">תפקיד</dt>
          <dd>{user.role}</dd>
        </dl>
      </div>
      <p className="text-black/60 dark:text-white/60">
        זהו שלד האזור האישי. התוכן האמיתי ייבנה בשלבים הבאים.
      </p>
    </div>
  );
}
