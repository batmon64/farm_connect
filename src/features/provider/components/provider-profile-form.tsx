"use client";

import { useActionState, useState } from "react";
import { Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { upsertProviderProfileAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import type { ProviderProfile } from "@/types/marketplace";

export function ProviderProfileForm({ profile }: { profile: ProviderProfile | null }) {
  const [state, formAction, isPending] = useActionState(
    upsertProviderProfileAction,
    initialMarketplaceFormState
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const hasExistingLocation = Boolean(profile?.location);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {coords ? (
        <>
          <input type="hidden" name="latitude" value={coords.lat} />
          <input type="hidden" name="longitude" value={coords.lng} />
        </>
      ) : null}

      {state.message ? (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="businessName">Business / provider name</Label>
        <Input
          id="businessName"
          name="businessName"
          className="h-11"
          defaultValue={profile?.business_name ?? ""}
          placeholder="e.g. Kochi Agri Services"
        />
        {state.fieldErrors?.businessName ? (
          <p className="text-destructive text-sm">{state.fieldErrors.businessName[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={profile?.description ?? ""}
          placeholder="What you offer and where you work"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
        <Input
          id="serviceRadiusKm"
          name="serviceRadiusKm"
          type="number"
          inputMode="numeric"
          min="1"
          className="h-11"
          defaultValue={profile?.service_radius_km ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Location</Label>
        <Button type="button" variant="outline" onClick={useCurrentLocation} className="h-11 justify-start">
          <MapPin className="size-4" aria-hidden />
          Use my current location
        </Button>
        {coords ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription>Location updated.</AlertDescription>
          </Alert>
        ) : hasExistingLocation ? (
          <p className="text-muted-foreground text-xs">Location already set.</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Used to show farmers your approximate distance from their job.
          </p>
        )}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border p-4">
        <span>
          <span className="block font-medium">Active</span>
          <span className="text-muted-foreground text-xs">
            Visible to farmers while active
          </span>
        </span>
        <Switch name="isActive" defaultChecked={profile?.is_active ?? true} />
      </label>

      <Button type="submit" disabled={isPending} className="h-11">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save provider profile"
        )}
      </Button>
    </form>
  );
}
