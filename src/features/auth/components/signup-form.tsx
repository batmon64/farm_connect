"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpAction } from "../actions";
import { initialAuthFormState } from "../types";
import { ResendVerificationForm } from "./resend-verification-form";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialAuthFormState
  );
  const [email, setEmail] = useState("");

  // A Server Action round-trip can reset this component's local state
  // entirely (not just uncontrolled inputs -- see the onboarding form
  // fix), so re-seed `email` from what was actually submitted whenever
  // the action returns a new state carrying it. Adjusted during render
  // (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValues, setPrevValues] = useState(state.values);
  if (state.values !== prevValues) {
    setPrevValues(state.values);
    if (state.values?.email) setEmail(state.values.email);
  }

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <ResendVerificationForm email={email} />
      </div>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? (
          <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="h-11"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password ? (
          <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            At least 8 characters, with a letter and a number.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="h-11"
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-destructive text-sm">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
