import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Provider profile — FarmConnect" };

export default async function ProviderProfilePage() {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  const { services } = await listServiceCatalogue(supabase);

  const [myServices, machines, workers, teams, availability] = providerProfile
    ? await Promise.all([
        listMyProviderServices(supabase, providerProfile.id),
        listMyMachines(supabase, providerProfile.id),
        listMyWorkers(supabase, providerProfile.id),
        listMyTeams(supabase, providerProfile.id),
        listMyAvailability(supabase, providerProfile.id),
      ])
    : [[], [], [], [], []];

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
      )}
    </div>
  );
}
