"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, MapPin, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createJobAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import { formatBudget, formatDate } from "@/features/marketplace/format";
import type { Service, ServiceCategory } from "@/types/marketplace";

type Draft = {
  categoryId: string;
  serviceId: string;
  title: string;
  description: string;
  quantity: string;
  unit: string;
  notes: string;
  needsWorkers: boolean;
  workerCount: string;
  skillRequirement: string;
  needsMachine: boolean;
  machineType: string;
  machineQuantity: string;
  operatorRequired: boolean;
  scheduledDate: string;
  startTime: string;
  durationHours: string;
  latitude: number | null;
  longitude: number | null;
  budgetAmount: string;
  budgetFlexible: boolean;
  budgetType: string;
};

const STEP_LABELS = [
  "What do you need?",
  "Describe the work",
  "Resources",
  "Schedule",
  "Location",
  "Budget",
  "Review",
];

function emptyDraft(): Draft {
  return {
    categoryId: "",
    serviceId: "",
    title: "",
    description: "",
    quantity: "",
    unit: "",
    notes: "",
    needsWorkers: false,
    workerCount: "",
    skillRequirement: "",
    needsMachine: false,
    machineType: "",
    machineQuantity: "",
    operatorRequired: true,
    scheduledDate: "",
    startTime: "",
    durationHours: "",
    latitude: null,
    longitude: null,
    budgetAmount: "",
    budgetFlexible: false,
    budgetType: "fixed",
  };
}

export function CreateJobWizard({
  categories,
  services,
}: {
  categories: ServiceCategory[];
  services: Service[];
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [state, formAction, isPending] = useActionState(createJobAction, initialMarketplaceFormState);

  const servicesInCategory = useMemo(
    () => services.filter((s) => s.category_id === draft.categoryId),
    [services, draft.categoryId]
  );
  const selectedService = services.find((s) => s.id === draft.serviceId) ?? null;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return Boolean(draft.serviceId);
      case 1:
        return draft.title.trim().length > 0;
      case 2:
        return true;
      case 3:
        return Boolean(draft.scheduledDate && draft.startTime && draft.durationHours);
      case 4:
        return true;
      case 5:
        return draft.budgetFlexible || Boolean(draft.budgetAmount);
      default:
        return true;
    }
  }

  function next() {
    if (step < STEP_LABELS.length - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude);
        update("longitude", pos.coords.longitude);
      },
      () => {
        // Silently ignore — location stays optional.
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  const payload = JSON.stringify({
    serviceId: draft.serviceId,
    title: draft.title,
    description: draft.description || undefined,
    quantity: draft.quantity ? Number(draft.quantity) : undefined,
    unit: draft.unit || undefined,
    notes: draft.notes || undefined,
    needsWorkers: draft.needsWorkers,
    workerCount: draft.needsWorkers && draft.workerCount ? Number(draft.workerCount) : undefined,
    skillRequirement: draft.needsWorkers ? draft.skillRequirement || undefined : undefined,
    needsMachine: draft.needsMachine,
    machineType: draft.needsMachine ? draft.machineType || undefined : undefined,
    machineQuantity: draft.needsMachine && draft.machineQuantity ? Number(draft.machineQuantity) : undefined,
    operatorRequired: draft.needsMachine ? draft.operatorRequired : undefined,
    scheduledDate: draft.scheduledDate,
    startTime: draft.startTime,
    durationHours: draft.durationHours ? Number(draft.durationHours) : undefined,
    latitude: draft.latitude ?? undefined,
    longitude: draft.longitude ?? undefined,
    budgetAmount: !draft.budgetFlexible && draft.budgetAmount ? Number(draft.budgetAmount) : undefined,
    budgetFlexible: draft.budgetFlexible,
    budgetType: draft.budgetFlexible ? "negotiable" : draft.budgetType,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{STEP_LABELS[step]}</span>
          <span className="text-muted-foreground">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
        </div>
        <Progress value={((step + 1) / STEP_LABELS.length) * 100} />
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          {step === 0 ? (
            <StepService
              categories={categories}
              servicesInCategory={servicesInCategory}
              draft={draft}
              update={update}
            />
          ) : null}
          {step === 1 ? <StepDetails draft={draft} update={update} selectedService={selectedService} /> : null}
          {step === 2 ? <StepResources draft={draft} update={update} /> : null}
          {step === 3 ? <StepSchedule draft={draft} update={update} /> : null}
          {step === 4 ? (
            <StepLocation draft={draft} useCurrentLocation={useCurrentLocation} />
          ) : null}
          {step === 5 ? <StepBudget draft={draft} update={update} /> : null}
          {step === 6 ? (
            <StepReview draft={draft} selectedService={selectedService} />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={back} className="h-11">
            <ChevronLeft className="size-4" aria-hidden />
            Back
          </Button>
        ) : null}

        {step < STEP_LABELS.length - 1 ? (
          <Button
            type="button"
            onClick={next}
            disabled={!canAdvance()}
            className="ml-auto h-11 min-w-32"
          >
            Continue
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <form action={formAction} className="ml-auto">
            <input type="hidden" name="payload" value={payload} />
            <Button type="submit" disabled={isPending} className="h-11 min-w-32 text-base">
              {isPending ? (
                <>
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Posting…
                </>
              ) : (
                "Post Job"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function StepService({
  categories,
  servicesInCategory,
  draft,
  update,
}: {
  categories: ServiceCategory[];
  servicesInCategory: Service[];
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Label>Category</Label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                update("categoryId", c.id);
                update("serviceId", "");
              }}
              className={`min-h-11 rounded-lg border p-3 text-left text-sm transition-colors ${
                draft.categoryId === c.id
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {draft.categoryId ? (
        <div className="flex flex-col gap-3">
          <Label>Service</Label>
          {servicesInCategory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No services in this category yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {servicesInCategory.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update("serviceId", s.id)}
                  className={`min-h-11 rounded-lg border p-3 text-left text-sm transition-colors ${
                    draft.serviceId === s.id
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-input hover:bg-muted/50"
                  }`}
                >
                  {s.name}
                  {s.description ? (
                    <span className="text-muted-foreground block text-xs font-normal">
                      {s.description}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StepDetails({
  draft,
  update,
  selectedService,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  selectedService: Service | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Job title</Label>
        <Input
          id="title"
          className="h-11"
          placeholder="e.g. Grass cutting — 2 acres"
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Any details providers should know"
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">
            Quantity {selectedService?.unit_type ? `(${selectedService.unit_type})` : ""}
          </Label>
          <Input
            id="quantity"
            type="number"
            inputMode="decimal"
            min="0"
            className="h-11"
            value={draft.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            className="h-11"
            placeholder={selectedService?.unit_type ?? "acre"}
            value={draft.unit}
            onChange={(e) => update("unit", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="e.g. field is near the main road"
          value={draft.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function StepResources({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        Optional — tell providers what help you need. You can skip this if you&apos;re not sure yet.
      </p>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Need workers?</span>
          <Switch checked={draft.needsWorkers} onCheckedChange={(v) => update("needsWorkers", v)} />
        </label>
        {draft.needsWorkers ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workerCount">How many workers?</Label>
              <Input
                id="workerCount"
                type="number"
                inputMode="numeric"
                min="1"
                className="h-11"
                value={draft.workerCount}
                onChange={(e) => update("workerCount", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="skillRequirement">Skill needed (optional)</Label>
              <Input
                id="skillRequirement"
                className="h-11"
                placeholder="e.g. experienced with coconut trees"
                value={draft.skillRequirement}
                onChange={(e) => update("skillRequirement", e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Need machinery?</span>
          <Switch checked={draft.needsMachine} onCheckedChange={(v) => update("needsMachine", v)} />
        </label>
        {draft.needsMachine ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="machineType">Machine type</Label>
              <Input
                id="machineType"
                className="h-11"
                placeholder="e.g. Brush Cutter"
                value={draft.machineType}
                onChange={(e) => update("machineType", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="machineQuantity">How many?</Label>
              <Input
                id="machineQuantity"
                type="number"
                inputMode="numeric"
                min="1"
                className="h-11"
                value={draft.machineQuantity}
                onChange={(e) => update("machineQuantity", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.operatorRequired}
                onCheckedChange={(v) => update("operatorRequired", v === true)}
              />
              Operator required
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepSchedule({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduledDate">Date</Label>
        <Input
          id="scheduledDate"
          type="date"
          min={today}
          className="h-11"
          value={draft.scheduledDate}
          onChange={(e) => update("scheduledDate", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input
            id="startTime"
            type="time"
            className="h-11"
            value={draft.startTime}
            onChange={(e) => update("startTime", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="durationHours">Expected duration (hours)</Label>
          <Input
            id="durationHours"
            type="number"
            inputMode="decimal"
            min="0.5"
            step="0.5"
            className="h-11"
            value={draft.durationHours}
            onChange={(e) => update("durationHours", e.target.value)}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        We&apos;ll work out the end time from your start time and duration.
      </p>
    </div>
  );
}

function StepLocation({
  draft,
  useCurrentLocation,
}: {
  draft: Draft;
  useCurrentLocation: () => void;
}) {
  const hasLocation = draft.latitude != null && draft.longitude != null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Your exact location is only shared with a provider after you accept their offer. Until
        then, providers only see your approximate area and distance.
      </p>
      <Button type="button" variant="outline" onClick={useCurrentLocation} className="h-11 justify-start">
        <MapPin className="size-4" aria-hidden />
        Use my current location
      </Button>
      {hasLocation ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>Location set for this job.</AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground text-xs">
          Optional — you can skip this and still post the job. Providers will see your general area
          from your profile.
        </p>
      )}
    </div>
  );
}

function StepBudget({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="budgetAmount">Budget amount (₹)</Label>
        <Input
          id="budgetAmount"
          type="number"
          inputMode="decimal"
          min="0"
          className="h-11"
          disabled={draft.budgetFlexible}
          value={draft.budgetAmount}
          onChange={(e) => update("budgetAmount", e.target.value)}
        />
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-4">
        <span>
          <span className="block font-medium">I&apos;m flexible on price</span>
          <span className="text-muted-foreground text-xs">Providers will quote in their offer</span>
        </span>
        <Switch checked={draft.budgetFlexible} onCheckedChange={(v) => update("budgetFlexible", v)} />
      </label>
    </div>
  );
}

function StepReview({
  draft,
  selectedService,
}: {
  draft: Draft;
  selectedService: Service | null;
}) {
  const scheduled =
    draft.scheduledDate && draft.startTime
      ? new Date(`${draft.scheduledDate}T${draft.startTime}:00`)
      : null;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <ReviewRow label="Service" value={selectedService?.name ?? "—"} />
      <ReviewRow label="Title" value={draft.title || "—"} />
      {draft.description ? <ReviewRow label="Description" value={draft.description} /> : null}
      {draft.quantity ? (
        <ReviewRow label="Quantity" value={`${draft.quantity} ${draft.unit || ""}`.trim()} />
      ) : null}
      {draft.needsWorkers ? (
        <ReviewRow
          label="Workers"
          value={`${draft.workerCount || "—"}${draft.skillRequirement ? ` · ${draft.skillRequirement}` : ""}`}
        />
      ) : null}
      {draft.needsMachine ? (
        <ReviewRow
          label="Machinery"
          value={`${draft.machineType || "—"} × ${draft.machineQuantity || 1}${
            draft.operatorRequired ? " (with operator)" : ""
          }`}
        />
      ) : null}
      <ReviewRow
        label="Date & time"
        value={scheduled ? `${formatDate(scheduled.toISOString())} at ${draft.startTime}` : "—"}
      />
      <ReviewRow label="Duration" value={draft.durationHours ? `${draft.durationHours} hours` : "—"} />
      <ReviewRow
        label="Location"
        value={draft.latitude != null ? "Set" : "Not set — using your profile area"}
      />
      <ReviewRow
        label="Budget"
        value={
          draft.budgetFlexible
            ? "Flexible"
            : formatBudget(Number(draft.budgetAmount) || null, Number(draft.budgetAmount) || null, "fixed")
        }
      />
      <Badge variant="secondary" className="w-fit">
        Nearby providers will see this right away
      </Badge>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
