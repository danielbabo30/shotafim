import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveUser } from "@/lib/app-user";
import { getMyNotifications } from "@/lib/notifications";
import { markAllNotificationsRead } from "@/lib/actions/notification-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "התראות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotificationsPage() {
  await requireActiveUser();
  const notifications = await getMyNotifications();
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">התראות</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {unread > 0 ? `${unread} התראות שלא נקראו` : "הכול נקרא"}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="ghost" size="md">
              סמן הכול כנקרא
            </Button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-8 text-sm">
          אין התראות עדיין.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "border-outline-variant bg-surface-lowest rounded-xl border p-4",
                !n.isRead && "border-s-primary border-s-4",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-on-surface font-semibold">{n.title}</p>
                <span className="text-on-surface-variant text-xs">
                  {dateFmt.format(n.createdAt)}
                </span>
              </div>
              <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">{n.message}</p>
              {n.actionUrl && n.actionUrl.startsWith("/") && (
                <Link
                  href={n.actionUrl}
                  className="text-primary mt-2 inline-block text-sm font-medium hover:underline"
                >
                  מעבר
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
