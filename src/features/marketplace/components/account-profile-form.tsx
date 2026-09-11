"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateAccountProfileAction } from "../actions";
import { initialMarketplaceFormState } from "../types";

export function AccountProfileForm({
  displayName,
  phone,
  location,
}: {
  displayName: string;
  phone: string;
  location: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAccountProfileAction,
    initialMarketplaceFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message ? (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" className="h-11" defaultValue={displayName} />
        {state.fieldErrors?.displayName ? (
          <p className="text-destructive text-sm">{state.fieldErrors.displayName[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" type="tel" className="h-11" defaultValue={phone} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          className="h-11"
          placeholder="e.g. Kochi, Kerala"
          defaultValue={location}
        />
      </div>

      <Button type="submit" disabled={isPending} className="h-11 w-full">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </Button>
    </form>
  );
}
