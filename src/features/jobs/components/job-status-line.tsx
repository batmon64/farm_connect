import { JOB_STATUS_ICON } from "./job-status-badge";
import { JOB_STATUS_LABEL } from "@/features/marketplace/format";
import type { JobStatus } from "@/types/marketplace";

const TONE: Record<string, string> = {
  draft: "text-muted-foreground",
  posted: "text-fc-warn",
  matching: "text-fc-warn",
  offers_received: "text-fc-warn",
  provider_selected: "text-fc-info",
  confirmed: "text-fc-info",
  in_progress: "text-fc-progress",
  completed: "text-fc-ok",
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
