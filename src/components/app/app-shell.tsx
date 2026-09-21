import type { ReactNode } from "react";
import { SidebarContent } from "@/components/app/sidebar-content";
import { AppTopbar } from "@/components/app/app-topbar";
import { ReviewPromptDialog } from "@/components/app/review/review-prompt-dialog";
import type { AppUser } from "@/lib/app-user";
import type { PendingReviewPrompt } from "@/lib/reviews";

/**
 * מעטפת האזור האישי — סייד-בר קבוע בדסקטופ (בצד ההתחלה = ימין ב-RTL),
 * מגירה במובייל, וסרגל עליון דביק. התוכן נכנס כ-children.
 */
export function AppShell({
  siteName,
  user,
  reviewPrompt,
  children,
}: {
  siteName: string;
  user: AppUser;
  reviewPrompt: PendingReviewPrompt | null;
  children: ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      {reviewPrompt && <ReviewPromptDialog prompt={reviewPrompt} mode="auto" />}
      <aside className="border-outline-variant bg-surface-lowest fixed inset-y-0 start-0 z-40 hidden w-60 border-e lg:block">
        <SidebarContent siteName={siteName} activeRole={user.activeRole} />
      </aside>

      <div className="flex min-h-screen flex-col lg:ps-60">
        <AppTopbar siteName={siteName} user={user} />
        <main className="mx-auto w-full max-w-[var(--container-site)] flex-1 px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
