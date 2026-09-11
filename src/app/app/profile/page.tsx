import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { AccountProfileForm } from "@/features/marketplace/components/account-profile-form";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Profile — FarmConnect" };

export default async function FarmerProfilePage() {
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase);
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <div className="mt-2 flex gap-2">
          {profile.is_farmer ? <Badge>Farmer</Badge> : null}
          {profile.is_provider ? <Badge variant="secondary">Provider</Badge> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountProfileForm
            displayName={profile.display_name ?? ""}
            phone={profile.phone ?? ""}
            location={profile.location ?? ""}
          />
        </CardContent>
      </Card>

      {profile.is_provider ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-5">
            <div>
              <p className="font-medium">Provider settings</p>
              <p className="text-muted-foreground text-sm">
                Manage your services, machines, and availability.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/provider/profile">Open</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <LogoutButton variant="outline" />
    </div>
  );
}
