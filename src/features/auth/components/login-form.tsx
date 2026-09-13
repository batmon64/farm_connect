"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logInAction } from "../actions";
import { initialAuthFormState } from "../types";
import { EMAIL_NOT_CONFIRMED_MESSAGE } from "../errors";
import { ResendVerificationForm } from "./resend-verification-form";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, isPending] = useActionState(
    logInAction,
    initialAuthFormState
  );
  const [email, setEmail] = useState("");

  // A Server Action round-trip can reset this component's local state
  // entirely (not just uncontrolled inputs), so re-seed `email` from
  // what was actually submitted whenever the action returns a new
  // state carrying it. Adjusted during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValues, setPrevValues] = useState(state.values);
  if (state.values !== prevValues) {
    setPrevValues(state.values);
    if (state.values?.email) setEmail(state.values.email);
  }

  const showResend = state.status === "error" && state.message === EMAIL_NOT_CONFIRMED_MESSAGE;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

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
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-destructive text-sm">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-destructive text-sm">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Logging in…
          </>
        ) : (
          "Log in"
        )}
      </Button>

      {showResend ? <ResendVerificationForm email={email} /> : null}

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
