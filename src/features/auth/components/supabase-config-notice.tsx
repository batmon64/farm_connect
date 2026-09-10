import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Shown instead of auth forms when Supabase env vars aren't set. */
export function SupabaseConfigNotice() {
  return (
    <Alert variant="destructive">
      <TriangleAlert className="size-4" />
      <AlertTitle>Supabase isn&apos;t configured</AlertTitle>
      <AlertDescription>
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>{" "}
        (copy from <code>.env.example</code>) and restart the dev server.
      </AlertDescription>
    </Alert>
  );
}
