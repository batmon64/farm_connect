/**
 * Mirrors public.profiles (supabase/migrations/0001_profiles.sql).
 * Hand-written for now; once a live Supabase project exists, prefer
 * `supabase gen types typescript` and replace this.
 */
export type Profile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  location: string | null;
  is_farmer: boolean;
  is_provider: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};
