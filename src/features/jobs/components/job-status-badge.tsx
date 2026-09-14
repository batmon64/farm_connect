import { Circle, Clock, Inbox, UserCheck, CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JOB_STATUS_LABEL } from "@/features/marketplace/format";
import type { JobStatus } from "@/types/marketplace";

type Tone = "muted" | "warn" | "info" | "progress" | "ok" | "danger";

const TONE: Record<string, Tone> = {
  draft: "muted",
  posted: "warn",
  matching: "warn",
  offers_received: "warn",
  provider_selected: "info",
  confirmed: "info",
  in_progress: "progress",
  completed: "ok",
  cancelled: "danger",
};

const TONE_CLASS: Record<Tone, string> = {
  muted: "bg-fc-surface-3 text-muted-foreground border-border",
  warn: "bg-fc-warn/14 text-fc-warn border-fc-warn/30",
  info: "bg-fc-info/14 text-fc-info border-fc-info/30",
  progress: "bg-fc-progress/14 text-fc-progress border-fc-progress/30",
  ok: "bg-fc-ok/14 text-fc-ok border-fc-ok/30",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
};

/** One icon per status so job state is never communicated by color
 * alone (Phase 3D accessibility pass). */
export const JOB_STATUS_ICON: Record<string, LucideIcon> = {
  draft: Circle,
  posted: Clock,
  matching: Clock,
  offers_received: Inbox,
  provider_selected: UserCheck,
  confirmed: UserCheck,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const Icon = JOB_STATUS_ICON[status] ?? Circle;
  const tone = TONE[status] ?? "muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      <Icon className="size-3" aria-hidden />
      {JOB_STATUS_LABEL[status] ?? status}
    </span>
  );
}
