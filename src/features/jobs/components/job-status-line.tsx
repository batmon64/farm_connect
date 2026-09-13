import { JOB_STATUS_ICON } from "./job-status-badge";
import { JOB_STATUS_LABEL } from "@/features/marketplace/format";
import type { JobStatus } from "@/types/marketplace";

const TONE: Record<string, string> = {
  draft: "text-muted-foreground",
  posted: "text-emerald-600 dark:text-emerald-400",
  matching: "text-emerald-600 dark:text-emerald-400",
  offers_received: "text-emerald-600 dark:text-emerald-400",
  provider_selected: "text-primary",
  confirmed: "text-primary",
  in_progress: "text-primary",
  completed: "text-muted-foreground",
  cancelled: "text-destructive",
};

/** A larger, more prominent status line than JobStatusBadge — for the
 * top of a job detail page, where the icon + color + text together
 * (never color alone) should make the job's state unmistakable at a
 * glance. Reuses the same icon/label mapping as the badge so the two
 * never drift apart. */
export function JobStatusLine({ status }: { status: JobStatus }) {
  const Icon = JOB_STATUS_ICON[status];
  const tone = TONE[status] ?? "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}>
      <Icon className="size-4" aria-hidden />
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}
