import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ListChecks, UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowSteps } from "@/components/marketing/flow-steps";

export const metadata: Metadata = { title: "For farmers — FarmConnect" };

export default function FarmerPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Post a job. Compare offers. Confirm who does the work.
        </h1>
        <p className="text-muted-foreground">
          FarmConnect connects you with nearby workers, machinery, and agricultural service
          providers — you stay in control of who you work with and at what price.
        </p>
      </div>

      <FlowSteps
        title="How it works"
        steps={[
          {
            icon: ClipboardList,
            title: "Post your job",
            description: "Describe the work, when you need it, and your budget.",
          },
          {
            icon: ListChecks,
            title: "Compare offers",
            description: "See price, availability, and provider trust signals side by side.",
          },
          {
            icon: UserCheck,
            title: "Confirm a provider",
            description: "Their exact location and contact details unlock once confirmed.",
          },
          {
            icon: CheckCircle2,
            title: "Get it done",
            description: "Track the job through to completion from your dashboard.",
          },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create your account</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
