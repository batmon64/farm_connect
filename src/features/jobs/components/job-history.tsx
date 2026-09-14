import { formatDateTime } from "@/features/marketplace/format";
import type { FarmJob } from "@/types/marketplace";

/** Derived entirely from existing timestamp/cancellation columns on
 * farm_jobs — no separate event-log table. If a genuine multi-event
 * audit trail is ever needed (e.g. multiple reschedules), that's a
 * distinct future design, not this. */
export function JobHistory({ job }: { job: FarmJob }) {
  const entries: { at: string; label: string; detail?: string }[] = [];

  if (job.started_at) entries.push({ at: job.started_at, label: "Work started" });
  if (job.completed_at) entries.push({ at: job.completed_at, label: "Job completed" });
  if (job.cancelled_at) {
    entries.push({
      at: job.cancelled_at,
      label: "Job cancelled",
      detail: job.cancellation_reason ?? undefined,
    });
  }

  if (entries.length === 0) return null;

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading font-semibold">Job history</h2>
      <div className="flex flex-col gap-3 text-sm">
        {entries.map((entry, i) => (
          <div key={i} className="border-border/60 border-b pb-3 last:border-0 last:pb-0">
            <p className="text-muted-foreground text-xs">{formatDateTime(entry.at)}</p>
            <p className="font-medium">{entry.label}</p>
            {entry.detail ? (
              <p className="text-muted-foreground mt-0.5">Reason: {entry.detail}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
