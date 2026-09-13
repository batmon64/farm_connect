import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Button } from "@/components/ui/button";
import {
  getMyProviderProfile,
  listMyAvailability,
  listMyMachines,
  listMyProviderServices,
  listMyTeams,
  listMyWorkers,
} from "@/features/provider/queries";
import { listServiceCatalogue } from "@/features/jobs/queries";
import { ProviderProfileForm } from "@/features/provider/components/provider-profile-form";
import { ServicesManager } from "@/features/provider/components/services-manager";
import { MachinesManager } from "@/features/provider/components/machines-manager";
import { WorkersTeamsManager } from "@/features/provider/components/workers-teams-manager";
import { AvailabilityManager } from "@/features/provider/components/availability-manager";
import { ProviderTrustSummary } from "@/features/provider/components/provider-trust-summary";
import { ProviderReviewsList } from "@/features/reviews/components/provider-reviews-list";
import { getProviderReviews } from "@/features/reviews/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Provider profile — FarmConnect" };

export default async function ProviderProfilePage() {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  const { services } = await listServiceCatalogue(supabase);

  const [myServices, machines, workers, teams, availability, reviews] = providerProfile
    ? await Promise.all([
        listMyProviderServices(supabase, providerProfile.id),
        listMyMachines(supabase, providerProfile.id),
        listMyWorkers(supabase, providerProfile.id),
        listMyTeams(supabase, providerProfile.id),
        listMyAvailability(supabase, providerProfile.id),
        getProviderReviews(supabase, providerProfile.id),
      ])
    : [[], [], [], [], [], []];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Provider profile</h1>

      {!providerProfile ? (
        <>
          <Alert>
            <AlertDescription>
              Set up your provider profile to start offering services and receiving jobs.
            </AlertDescription>
          </Alert>
          <ProviderProfileForm profile={null} />
        </>
      ) : (
        <>
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground mb-3 text-xs">This is how farmers see you</p>
              <ProviderTrustSummary
                businessName={providerProfile.business_name}
                ratingAverage={providerProfile.rating_average}
                ratingCount={providerProfile.rating_count}
                completedJobsCount={providerProfile.completed_jobs_count}
                verificationStatus={providerProfile.verification_status}
                serviceNames={myServices
                  .filter((s) => s.is_active)
                  .map((s) => s.services?.name)
                  .filter((name): name is string => Boolean(name))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <h2 className="font-medium">Reviews</h2>
              <ProviderReviewsList reviews={reviews} />
            </CardContent>
          </Card>

          <Tabs defaultValue="business">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="availability">Hours</TabsTrigger>
          </TabsList>
          <TabsContent value="business" className="pt-4">
            <ProviderProfileForm profile={providerProfile} />
          </TabsContent>
          <TabsContent value="services" className="pt-4">
            <ServicesManager services={services} myServices={myServices as never} />
          </TabsContent>
          <TabsContent value="machines" className="pt-4">
            <MachinesManager machines={machines as never} services={services} />
          </TabsContent>
          <TabsContent value="team" className="pt-4">
            <WorkersTeamsManager workers={workers} teams={teams as never} />
          </TabsContent>
          <TabsContent value="availability" className="pt-4">
            <AvailabilityManager availability={availability} />
          </TabsContent>
          </Tabs>
        </>
      )}

      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-5">
          <div>
            <p className="font-medium">Account settings</p>
            <p className="text-muted-foreground text-sm">
              Update your name, phone, and location.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/profile">Open</Link>
          </Button>
        </CardContent>
      </Card>

      <LogoutButton variant="outline" />
    </div>
  );
}
