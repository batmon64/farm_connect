"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { acceptOfferAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";

export function AcceptOfferButton({
  offerId,
  jobId,
  providerName,
}: {
  offerId: string;
  jobId: string;
  providerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(acceptOfferAction, initialMarketplaceFormState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9">
          Accept offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept this offer?</DialogTitle>
          <DialogDescription>
            You&apos;re about to confirm {providerName} for this job. Your exact location and
            contact details will become visible to them once confirmed. This can&apos;t be
            undone from here.
          </DialogDescription>
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
            <input type="hidden" name="offerId" value={offerId} />
            <input type="hidden" name="jobId" value={jobId} />
            <Button type="submit" disabled={isPending} className="h-11 w-full">
              {isPending ? (
                <>
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Confirming…
                </>
              ) : (
                "Confirm provider"
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
