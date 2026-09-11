import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listServiceCatalogue } from "@/features/jobs/queries";
import { CreateJobWizard } from "@/features/jobs/components/create-job-wizard";

export const metadata: Metadata = { title: "Post a Job — FarmConnect" };

export default async function NewJobPage() {
  const supabase = await createClient();
  const { categories, services } = await listServiceCatalogue(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Post a Job</h1>
        <p className="text-muted-foreground text-sm">Tell us what work you need done.</p>
      </div>
      <CreateJobWizard categories={categories} services={services} />
    </div>
  );
}
