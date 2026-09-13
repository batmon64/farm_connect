"use client";

import { useActionState, useState } from "react";
import { Loader2, Play, CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { transitionJobStatusAction } from "../actions";
import { initialMarketplaceFormState, type MarketplaceFormState } from "@/features/marketplace/types";
import { CANCELLATION_REASONS } from "@/types/marketplace";
import type { JobStatus } from "@/types/marketplace";

/** Closes the dialog once the action state flips to "success" — adjusts
 * state during render when `state` changes rather than in a useEffect,
 * per React's "storing information from previous renders" pattern, so
 * this doesn't trigger an extra render-then-effect cascade. */
function useCloseDialogOnSuccess(state: MarketplaceFormState, setOpen: (open: boolean) => void) {
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "success") setOpen(false);
  }
}

/** Renders the right set of lifecycle action buttons for who's looking
 * (farmer/job-owner vs. the assigned provider) and the job's current
 * status. Every action still goes through transition_job_status() on
 * the server, which re-checks all of this independently — these
 * booleans only decide what's worth showing, never what's allowed. */
export function JobLifecycleActions({
  jobId,
  status,
  viewerRole,
}: {
  jobId: string;
  status: JobStatus;
  viewerRole: "farmer" | "provider";
}) {
  const showStart = viewerRole === "provider" && status === "confirmed";
  const showComplete =
    (viewerRole === "provider" && status === "in_progress") ||
    (viewerRole === "farmer" && (status === "confirmed" || status === "in_progress"));
  const showCancel = viewerRole === "farmer" && (status === "confirmed" || status === "in_progress");

  if (!showStart && !showComplete && !showCancel) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {showStart ? (
        <ConfirmActionDialog
          jobId={jobId}
          action="start"
          triggerLabel="Start Job"
          triggerIcon={Play}
          dialogTitle="Start this job?"
          dialogDescription="This will mark the job as in progress."
          confirmLabel="Start job"
        />
      ) : null}
      {showComplete ? (
        <ConfirmActionDialog
          jobId={jobId}
          action="complete"
          triggerLabel="Mark Completed"
          triggerIcon={CheckCircle2}
          dialogTitle="Mark this job as completed?"
          dialogDescription="Confirm only after the work has actually been completed."
          confirmLabel="Mark completed"
        />
      ) : null}
      {showCancel ? <CancelJobDialog jobId={jobId} /> : null}
    </div>
  );
}

function ConfirmActionDialog({
  jobId,
  action,
  triggerLabel,
  triggerIcon: Icon,
  dialogTitle,
  dialogDescription,
  confirmLabel,
}: {
  jobId: string;
  action: "start" | "complete";
  triggerLabel: string;
  triggerIcon: typeof Play;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    transitionJobStatusAction,
    initialMarketplaceFormState
  );

  useCloseDialogOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="h-11" onClick={() => setOpen(true)}>
        <Icon className="size-4" aria-hidden />
        {triggerLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11">
            Cancel
          </Button>
          <form action={formAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="action" value={action} />
            <Button type="submit" disabled={isPending} className="h-11 w-full">
              {isPending ? (
                <>
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelJobDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [state, formAction, isPending] = useActionState(
    transitionJobStatusAction,
    initialMarketplaceFormState
  );

  useCloseDialogOnSuccess(state, setOpen);

  const finalReason = reason === "Other" && otherDetail.trim() ? `Other: ${otherDetail.trim()}` : reason;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          setOtherDetail("");
        }
      }}
    >
      <Button variant="outline" className="h-11" onClick={() => setOpen(true)}>
        <Ban className="size-4" aria-hidden />
        Cancel Job
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this job?</DialogTitle>
          <DialogDescription>This action will notify the other party.</DialogDescription>
        </DialogHeader>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="cancellationReasonSelect">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="cancellationReasonSelect" className="h-11 w-full">
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reason === "Other" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="otherDetail">Tell us more (optional)</Label>
            <Textarea
              id="otherDetail"
              value={otherDetail}
              onChange={(e) => setOtherDetail(e.target.value)}
              placeholder="A short explanation"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11">
            Keep job
          </Button>
          <form action={formAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="action" value="cancel" />
            <input type="hidden" name="cancellationReason" value={finalReason} />
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !reason}
              className="h-11 w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Cancelling…
                </>
              ) : (
                "Cancel job"
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
