import { FileText, CheckCircle2, PlayCircle, Ban, Info } from "lucide-react";
import { markNotificationReadAction } from "../actions";
import { notificationHref } from "../queries";
import { formatRelativeTime } from "@/features/marketplace/format";
import type { Notification } from "@/types/marketplace";

const TYPE_ICON: Record<Notification["type"], typeof FileText> = {
  offer_received: FileText,
  offer_accepted: CheckCircle2,
  job_started: PlayCircle,
  job_completed: CheckCircle2,
  job_cancelled: Ban,
  system: Info,
};

/** Same tone family as the job-status pill system, so an "offer
 * accepted" notification and a "Confirmed" status badge read as the
 * same color everywhere in the app. */
const TYPE_TONE_CLASS: Record<Notification["type"], string> = {
  offer_received: "bg-fc-warn/14 text-fc-warn",
  offer_accepted: "bg-fc-info/14 text-fc-info",
  job_started: "bg-fc-progress/14 text-fc-progress",
  job_completed: "bg-fc-ok/14 text-fc-ok",
  job_cancelled: "bg-destructive/12 text-destructive",
  system: "bg-fc-surface-3 text-muted-foreground",
};

export function NotificationRow({
  notification,
  isFarmerForJob,
}: {
  notification: Notification;
  isFarmerForJob?: boolean;
}) {
  const isUnread = notification.read_at === null;
  const href = notificationHref(notification, isFarmerForJob);
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
        <span className={`mt-0.5 rounded-full p-1.5 ${TYPE_TONE_CLASS[notification.type]}`}>
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
