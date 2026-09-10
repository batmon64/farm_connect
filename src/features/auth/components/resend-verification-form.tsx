"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resendVerificationAction } from "../actions";
import { initialAuthFormState } from "../types";

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    initialAuthFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      {state.message ? (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        disabled={isPending || !email}
        className="h-11 text-base"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>
    </form>
  );
}
