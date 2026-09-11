"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitOfferAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";

export function SubmitOfferForm({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState(submitOfferAction, initialMarketplaceFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="price">Your price (₹)</Label>
        <Input id="price" name="price" type="number" inputMode="decimal" min="0" className="h-11" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message to farmer (optional)</Label>
        <Textarea id="message" name="message" placeholder="Anything you'd like the farmer to know" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimatedStartDate">You can start</Label>
          <Input id="estimatedStartDate" name="estimatedStartDate" type="date" className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimatedStartTime">Time</Label>
          <Input id="estimatedStartTime" name="estimatedStartTime" type="time" className="h-11" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="estimatedDurationHours">Estimated duration (hours)</Label>
        <Input
          id="estimatedDurationHours"
          name="estimatedDurationHours"
          type="number"
          inputMode="decimal"
          min="0.5"
          step="0.5"
          className="h-11"
        />
      </div>

      <Button type="submit" disabled={isPending} className="h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Submitting…
          </>
        ) : (
          "Make an Offer"
        )}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Submitting an offer doesn&apos;t reserve you for this job — the farmer needs to accept it first.
      </p>
    </form>
  );
}
