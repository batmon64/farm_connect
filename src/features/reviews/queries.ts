import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderReview, Review } from "@/types/marketplace";

/** Reviews about one provider, newest first, with a privacy-safe
 * reviewer label — never the reviewer's real name/phone/id. Backed by
 * get_provider_reviews() (0024) rather than a direct table select, so
 * the column allowlist lives in one place (see ARCHITECTURE.md). */
export async function getProviderReviews(
  supabase: SupabaseClient,
  providerProfileId: string
): Promise<ProviderReview[]> {
  const { data, error } = await supabase.rpc("get_provider_reviews", {
    p_provider_profile_id: providerProfileId,
  });
  if (error) throw error;
  return (data ?? []) as ProviderReview[];
}

/** Has the current user already reviewed this assignment? RLS already
 * scopes `reviews` reads to rows the caller is the reviewer or reviewee
 * of (plus marketplace-public provider-directed rows), so a plain
 * table query — not an RPC — is enough here. */
export async function getMyReviewForAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  userId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("reviewer_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Review | null;
}
