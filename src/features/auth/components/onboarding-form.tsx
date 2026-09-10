"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { completeOnboardingAction } from "../actions";
import { initialAuthFormState } from "../types";

export function OnboardingForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialAuthFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          autoFocus
          className="h-11"
          defaultValue={defaultDisplayName}
          aria-invalid={Boolean(state.fieldErrors?.displayName)}
        />
        {state.fieldErrors?.displayName ? (
          <p className="text-destructive text-sm">
            {state.fieldErrors.displayName[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Label>I want to use FarmConnect as</Label>
        <label className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-sm transition-colors">
          <Checkbox name="isFarmer" className="mt-0.5" />
          <span>
            <span className="block font-medium">Farmer</span>
            <span className="text-muted-foreground">I need work done</span>
          </span>
        </label>
        <label className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-sm transition-colors">
          <Checkbox name="isProvider" className="mt-0.5" />
          <span>
            <span className="block font-medium">Provider</span>
            <span className="text-muted-foreground">
              I offer labour, machinery, or services
            </span>
          </span>
        </label>
        {state.fieldErrors?.isFarmer ? (
          <p className="text-destructive text-sm">{state.fieldErrors.isFarmer[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">
          Phone number <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">
          Location <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="location"
          name="location"
          placeholder="e.g. Kochi, Kerala"
          className="h-11"
        />
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}
