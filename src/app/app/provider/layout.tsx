import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase);

  if (!profile?.is_provider) redirect("/app");

  return <>{children}</>;
}
