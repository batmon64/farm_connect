import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Notifications — FarmConnect" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const notifications = await listNotifications(supabase, user.id);
  const hasUnread = notifications.some((n) => n.read_at === null);

  // "job_completed" is the one notification type either a farmer or a
  // provider can receive — resolve which side this viewer is on for
  // each such job with one batched query, so click-through can route
  // correctly (see notificationHref).
  const ambiguousJobIds = [
    ...new Set(
      notifications
        .filter((n) => n.type === "job_completed" && n.related_entity_type === "job" && n.related_entity_id)
        .map((n) => n.related_entity_id as string)
    ),
  ];
  let ownedJobIds = new Set<string>();
  if (ambiguousJobIds.length > 0) {
    const { data } = await supabase
      .from("farm_jobs")
      .select("id")
      .in("id", ambiguousJobIds)
      .eq("created_by", user.id);
    ownedJobIds = new Set((data ?? []).map((j) => j.id as string));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {hasUnread ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet."
          description="Updates about your jobs and offers will appear here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              isFarmerForJob={
                notification.related_entity_id ? ownedJobIds.has(notification.related_entity_id) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
