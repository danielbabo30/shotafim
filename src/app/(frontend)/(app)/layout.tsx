import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireActiveUser } from "@/lib/app-user";
import { getShellData } from "@/lib/cms";

/**
 * Layout של האזור האישי המוגן.
 * requireActiveUser מאמת מול ה-DB ומפנה חזרה לשלבי ההרשמה כל עוד ההרשמה לא הושלמה
 * (ה-proxy עושה רק בדיקת-עוגייה אופטימית).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, shell] = await Promise.all([requireActiveUser(), getShellData()]);

  return (
    <AppShell siteName={shell.siteName} user={user}>
      {children}
    </AppShell>
  );
}
