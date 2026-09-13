import { FileText, CheckCircle2, Info } from "lucide-react";
import { markNotificationReadAction } from "../actions";
import { notificationHref } from "../queries";
import { formatRelativeTime } from "@/features/marketplace/format";
import type { Notification } from "@/types/marketplace";

const TYPE_ICON: Record<Notification["type"], typeof FileText> = {
  offer_received: FileText,
  offer_accepted: CheckCircle2,
  system: Info,
};

export function NotificationRow({ notification }: { notification: Notification }) {
  const isUnread = notification.read_at === null;
  const href = notificationHref(notification);
  const Icon = TYPE_ICON[notification.type];

  return (
    <form action={markNotificationReadAction}>
      <input type="hidden" name="notificationId" value={notification.id} />
      {href ? <input type="hidden" name="redirectTo" value={href} /> : null}
      <button
        type="submit"
        className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
          isUnread ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40"
        }`}
      >
        <span
          className={`mt-0.5 rounded-full p-1.5 ${
            isUnread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
              {notification.title}
            </span>
            {isUnread ? <span className="bg-primary size-1.5 rounded-full" aria-hidden /> : null}
          </span>
          {notification.body ? (
            <span className="text-muted-foreground text-sm">{notification.body}</span>
          ) : null}
          <span className="text-muted-foreground mt-1 text-xs">
            {formatRelativeTime(notification.created_at)}
          </span>
        </span>
      </button>
    </form>
  );
}
