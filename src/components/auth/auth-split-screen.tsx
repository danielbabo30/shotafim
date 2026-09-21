import type { ReactNode } from "react";
import { AuthSidePanel } from "@/components/marketing/auth-side-panel";
import { getAuthPanelData } from "@/lib/auth-panel";
import { getShellData } from "@/lib/cms";

/**
 * מסך מפוצל למסכי הרשמה/כניסה — הפאנל הכהה (נשלט מ-CMS) בצד, והתוכן בצד השני.
 * במובייל הפאנל מוסתר והתוכן לרוחב מלא.
 */
export async function AuthSplitScreen({ children }: { children: ReactNode }) {
  const [panel, shell] = await Promise.all([getAuthPanelData(), getShellData()]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSidePanel panel={panel} siteName={shell.siteName} />
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}
