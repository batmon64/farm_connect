import Link from "next/link";
import { Calendar, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { JobStatusBadge } from "./job-status-badge";
import { formatBudget, formatDate } from "@/features/marketplace/format";
import type { FarmJob } from "@/types/marketplace";

export function JobCard({ job, serviceName }: { job: FarmJob; serviceName?: string }) {
  return (
    <Link href={`/app/jobs/${job.id}`}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium">{job.title}</h3>
            <JobStatusBadge status={job.status} />
          </div>
          {serviceName ? <p className="text-muted-foreground text-sm">{serviceName}</p> : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {formatDate(job.scheduled_start)}
            </span>
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="size-3.5" aria-hidden />
              {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
