import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile } from "@/features/auth/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoutButton } from "@/features/auth/components/logout-button";

export const metadata: Metadata = { title: "Your account — FarmConnect" };

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Next.js renders a layout and its page concurrently, so this can start
  // executing even on a request where AppLayout is about to render its
  // "not configured" branch instead of {children}. Guard independently
  // rather than relying on the layout to prevent this from ever running.
  if (!env.isSupabaseConfiguredPublic()) return null;

  const supabase = await createClient();
  // AppLayout already guarantees a signed-in, onboarded user before this
  // renders, so this lookup exists only to display it.
  const { user, profile } = await getCurrentProfile(supabase);
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {error === "logout_failed" ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription>Couldn&apos;t log out. Please try again.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Welcome, {profile?.display_name || user?.email}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {profile?.is_farmer ? <Badge>Farmer</Badge> : null}
            {profile?.is_provider ? <Badge variant="secondary">Provider</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Your FarmConnect dashboard will appear here in a future phase —
            job posting, matching, and bookings aren&apos;t built yet.
          </p>
          <div>
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
