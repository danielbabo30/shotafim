import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireActiveUser } from "@/lib/app-user";
import { getShellData } from "@/lib/cms";
import { getPendingReviewPrompt } from "@/lib/reviews";

/**
 * Layout של האזור האישי המוגן.
 * requireActiveUser מאמת מול ה-DB ומפנה חזרה לשלבי ההרשמה כל עוד ההרשמה לא הושלמה
 * (ה-proxy עושה רק בדיקת-עוגייה אופטימית).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, shell, reviewPrompt] = await Promise.all([
    requireActiveUser(),
    getShellData(),
    getPendingReviewPrompt(),
  ]);

  return (
    <AppShell siteName={shell.siteName} user={user} reviewPrompt={reviewPrompt}>
      {children}
    </AppShell>
  );
}
