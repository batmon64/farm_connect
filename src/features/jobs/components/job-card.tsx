import Link from "next/link";
import { JobStatusBadge } from "./job-status-badge";
import { formatBudget, formatDate, formatRelativeTime } from "@/features/marketplace/format";
import type { FarmJob } from "@/types/marketplace";

export function JobCard({ job, serviceName }: { job: FarmJob; serviceName?: string }) {
  return (
    <Link
      href={`/app/jobs/${job.id}`}
      className="border-border bg-card hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <JobStatusBadge status={job.status} />
        <span className="text-muted-foreground font-mono text-[11px]">
          {formatRelativeTime(job.created_at)}
        </span>
      </div>
      <div>
        <h3 className="font-heading font-semibold">{job.title}</h3>
        {serviceName ? <p className="text-muted-foreground text-sm">{serviceName}</p> : null}
      </div>
      <dl className="border-border grid grid-cols-2 gap-3 border-t pt-3 text-sm">
        <div>
          <dt className="text-muted-foreground font-mono text-[10.5px] tracking-[0.1em] uppercase">
            Timing
          </dt>
          <dd className="mt-0.5">{formatDate(job.scheduled_start)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground font-mono text-[10.5px] tracking-[0.1em] uppercase">
            Budget
          </dt>
          <dd className="mt-0.5">{formatBudget(job.budget_min, job.budget_max, job.budget_type)}</dd>
        </div>
      </dl>
    </Link>
  );
}
