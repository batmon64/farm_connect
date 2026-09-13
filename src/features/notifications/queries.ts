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

/** Where a notification's "click through" should land. The destination
 * page still enforces its own authorization independently (RLS on the
 * farmer page, an assignment check on the provider page) — this only
 * picks a URL, it grants nothing.
 *
 * Most event types have an unambiguous recipient side (offer_received/
 * job_started always go to the farmer; offer_accepted/job_cancelled
 * always go to the provider, since only a farmer can cancel).
 * `job_completed` is the one type either side can receive — the caller
 * resolves that ahead of time (one small batched query in the
 * notifications page) and passes it as `isFarmerForJob`. */
export function notificationHref(notification: Notification, isFarmerForJob?: boolean): string | null {
  if (notification.related_entity_type !== "job" || !notification.related_entity_id) {
    return null;
  }
  const jobId = notification.related_entity_id;
  switch (notification.type) {
    case "offer_received":
    case "job_started":
      return `/app/jobs/${jobId}`;
    case "offer_accepted":
    case "job_cancelled":
      return `/app/provider/jobs/${jobId}`;
    case "job_completed":
      return isFarmerForJob ? `/app/jobs/${jobId}` : `/app/provider/jobs/${jobId}`;
    default:
      return null;
  }
}
