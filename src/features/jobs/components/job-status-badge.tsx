import { Circle, Clock, Inbox, UserCheck, CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_LABEL } from "@/features/marketplace/format";
import type { JobStatus } from "@/types/marketplace";

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  posted: "secondary",
  matching: "secondary",
  offers_received: "secondary",
  provider_selected: "default",
  confirmed: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
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
  return (
    <Badge variant={VARIANT[status] ?? "outline"}>
      <Icon className="size-3" aria-hidden />
      {JOB_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
