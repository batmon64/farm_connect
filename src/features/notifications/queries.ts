import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/marketplace";

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Notification[];
}

/** Where a notification's "click through" should land. Some event types
 * (offer_accepted, for a provider) have no single-job detail route once
 * a job leaves the open/discoverable set, so they route to a list view
 * instead of a deep link. */
export function notificationHref(notification: Notification): string | null {
  if (notification.related_entity_type !== "job" || !notification.related_entity_id) {
    return null;
  }
  switch (notification.type) {
    case "offer_received":
      return `/app/jobs/${notification.related_entity_id}`;
    case "offer_accepted":
      return "/app/provider";
    default:
      return null;
  }
}
