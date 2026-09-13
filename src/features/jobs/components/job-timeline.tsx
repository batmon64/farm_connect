import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { JobStatus } from "@/types/marketplace";

type StepState = "done" | "current" | "pending" | "cancelled";
type Step = { label: string; state: StepState };

/** Timeline steps for a job that has reached at least 'confirmed' — the
 * screens showing this already cover the pre-confirmation posted/offers
 * stage on their own, so the timeline starts from "Job posted" as a
 * completed first step rather than duplicating that earlier UI. */
function buildSteps(status: JobStatus): Step[] {
  if (status === "cancelled") {
    return [
      { label: "Job posted", state: "done" },
      { label: "Offer accepted", state: "done" },
      { label: "Cancelled", state: "cancelled" },
    ];
  }

  const offerAccepted: StepState =
    status === "confirmed" || status === "in_progress" || status === "completed" ? "done" : "pending";

  const inProgress: StepState =
    status === "in_progress" ? "current" : status === "completed" ? "done" : "pending";

  const completed: StepState = status === "completed" ? "done" : "pending";

  return [
    { label: "Job posted", state: "done" },
    { label: "Offer accepted", state: offerAccepted },
    { label: "Work in progress", state: inProgress },
    { label: "Completed", state: completed },
  ];
}

export function JobTimeline({ status }: { status: JobStatus }) {
  const steps = buildSteps(status);

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => (
        <li key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon state={step.state} />
            {i < steps.length - 1 ? (
              <span
                className={`w-px flex-1 ${
                  step.state === "done" ? "bg-primary/40" : "bg-border"
                }`}
                style={{ minHeight: "1.5rem" }}
                aria-hidden
              />
            ) : null}
          </div>
          <p
            className={`pb-6 text-sm last:pb-0 ${
              step.state === "pending"
                ? "text-muted-foreground"
                : step.state === "cancelled"
                  ? "text-destructive font-medium"
                  : "font-medium"
            }`}
          >
            {step.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return <CheckCircle2 className="text-primary size-5 shrink-0" aria-label="Done" />;
  }
  if (state === "current") {
    return (
      <span className="relative flex size-5 shrink-0 items-center justify-center" aria-label="In progress">
        <span className="bg-primary/30 absolute size-5 animate-ping rounded-full" aria-hidden />
        <span className="bg-primary relative size-2.5 rounded-full" aria-hidden />
      </span>
    );
  }
  if (state === "cancelled") {
    return <XCircle className="text-destructive size-5 shrink-0" aria-label="Cancelled" />;
  }
  return <Circle className="text-muted-foreground size-5 shrink-0" aria-label="Not yet reached" />;
}
