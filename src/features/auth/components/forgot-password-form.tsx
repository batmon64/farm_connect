"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgotPasswordAction } from "../actions";
import { initialAuthFormState } from "../types";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialAuthFormState
  );

  if (state.status === "success") {
    return (
      <Alert>
        <CheckCircle2 className="size-4" />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          className="h-11"
          defaultValue={state.values?.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? (
          <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Remembered it?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
