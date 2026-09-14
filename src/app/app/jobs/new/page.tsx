import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { listServiceCatalogue } from "@/features/jobs/queries";
import { CreateJobWizard } from "@/features/jobs/components/create-job-wizard";

export const metadata: Metadata = { title: "Post a Job — FarmConnect" };

export default async function NewJobPage() {
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase);
  if (!profile?.is_farmer) redirect(profile?.is_provider ? "/app/provider" : "/app");

  const { categories, services } = await listServiceCatalogue(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">Post a Job</h1>
        <p className="text-muted-foreground text-sm">Tell us what work you need done.</p>
      </div>
      <CreateJobWizard categories={categories} services={services} />
    </div>
  );
}
