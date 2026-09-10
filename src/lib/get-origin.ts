import { headers } from "next/headers";

/**
 * The current request's origin, derived from forwarded headers so it's
 * correct in both local dev and behind Vercel's proxy — used to build
 * absolute redirect URLs for Supabase auth emails.
 */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
