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

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={VARIANT[status] ?? "outline"}>{JOB_STATUS_LABEL[status] ?? status}</Badge>;
}
