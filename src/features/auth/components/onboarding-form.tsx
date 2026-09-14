"use client";

import { useActionState, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, Sprout, Wrench, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { completeOnboardingAction } from "../actions";
import { initialAuthFormState } from "../types";

const STEP_LABELS = ["Your role", "Your name", "Phone number", "Your area", "Confirm"];

type Draft = {
  isFarmer: boolean;
  isProvider: boolean;
  displayName: string;
  phone: string;
  location: string;
};

export function OnboardingForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialAuthFormState
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    isFarmer: false,
    isProvider: false,
    displayName: defaultDisplayName,
    phone: "",
    location: "",
  });

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return draft.isFarmer || draft.isProvider;
      case 1:
        return draft.displayName.trim().length > 0;
      default:
        return true;
    }
  }

  const lastStep = STEP_LABELS.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold">{STEP_LABELS[step]}</span>
          <span className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
        </div>
        <div className="bg-fc-surface-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form
        action={formAction}
        className="flex flex-col gap-5"
        noValidate
        onKeyDown={(e) => {
          // Prevent Enter from implicitly submitting the form (via the
          // browser's default single-field submission) before the last
          // step, since the visible submit button only exists there.
          if (e.key === "Enter" && step < lastStep) e.preventDefault();
        }}
      >
        <input type="hidden" name="displayName" value={draft.displayName} />
        <input type="hidden" name="isFarmer" value={draft.isFarmer ? "on" : ""} />
        <input type="hidden" name="isProvider" value={draft.isProvider ? "on" : ""} />
        <input type="hidden" name="phone" value={draft.phone} />
        <input type="hidden" name="location" value={draft.location} />

        {step === 0 ? <StepRole draft={draft} update={update} /> : null}
        {step === 1 ? <StepName draft={draft} update={update} /> : null}
        {step === 2 ? <StepPhone draft={draft} update={update} /> : null}
        {step === 3 ? <StepLocation draft={draft} update={update} /> : null}
        {step === 4 ? <StepConfirm draft={draft} /> : null}

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="h-11"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Back
            </Button>
          ) : null}

          {step < lastStep ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="ml-auto h-11 min-w-32"
            >
              Continue
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" disabled={isPending} className="ml-auto h-11 min-w-32 text-base">
              {isPending ? (
                <>
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Finish setup"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepRole({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Choose one or both — you can change this any time.
      </p>
      <RoleCard
        icon={Sprout}
        title="Farmer"
        description="I need work done"
        checked={draft.isFarmer}
        onToggle={() => update("isFarmer", !draft.isFarmer)}
      />
      <RoleCard
        icon={Wrench}
        title="Provider"
        description="I offer labour, machinery, or services"
        checked={draft.isProvider}
        onToggle={() => update("isProvider", !draft.isProvider)}
      />
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: typeof Sprout;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-fc-surface-2"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-primary text-primary-foreground" : "bg-fc-surface-3 text-muted-foreground"
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="font-heading block font-semibold">{title}</span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </span>
      {checked ? <Check className="text-primary size-5 shrink-0" aria-hidden /> : null}
    </button>
  );
}

function StepName({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="ob-displayName">What should we call you?</Label>
      <Input
        id="ob-displayName"
        autoFocus
        className="h-11"
        value={draft.displayName}
        onChange={(e) => update("displayName", e.target.value)}
      />
      <p className="text-muted-foreground text-xs">
        This is the name the other side sees — providers or farmers you work with.
      </p>
    </div>
  );
}

function StepPhone({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="ob-phone">
        Phone number <span className="text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id="ob-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className="h-11"
        value={draft.phone}
        onChange={(e) => update("phone", e.target.value)}
      />
      <p className="text-muted-foreground text-xs">
        Kept private — only shared with the other side once you confirm a job together.
      </p>
    </div>
  );
}

function StepLocation({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="ob-location">
        Location <span className="text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id="ob-location"
        placeholder="e.g. Kochi, Kerala"
        className="h-11"
        value={draft.location}
        onChange={(e) => update("location", e.target.value)}
      />
      <p className="text-muted-foreground text-xs">
        Only the general area is shown — never an exact address.
      </p>
    </div>
  );
}

function StepConfirm({ draft }: { draft: Draft }) {
  const roles = [draft.isFarmer && "Farmer", draft.isProvider && "Provider"]
    .filter(Boolean)
    .join(" & ");
  return (
    <div className="border-border rounded-lg border">
      <ReviewRow label="Role" value={roles || "—"} />
      <ReviewRow label="Name" value={draft.displayName || "—"} />
      <ReviewRow label="Phone" value={draft.phone || "Not set"} />
      <ReviewRow label="Location" value={draft.location || "Not set"} />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
