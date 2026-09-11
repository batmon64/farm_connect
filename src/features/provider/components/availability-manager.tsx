"use client";

import { useActionState } from "react";
import { Loader2, Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { addAvailabilityAction, removeAvailabilityAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import type { ProviderAvailability } from "@/types/marketplace";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AvailabilityManager({ availability }: { availability: ProviderAvailability[] }) {
  const [state, formAction, isPending] = useActionState(
    addAvailabilityAction,
    initialMarketplaceFormState
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        Set the days and hours you&apos;re generally available. This helps farmers know when to
        expect a response.
      </p>

      {availability.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No availability set yet."
          description="Add your weekly working hours below."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {availability.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium">
                  {DAYS[a.day_of_week]} · {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                </span>
                <form action={removeAvailabilityAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="ghost" size="icon" aria-label="Remove">
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <form action={formAction} className="flex flex-col gap-4">
            {state.message ? (
              <Alert variant={state.status === "error" ? "destructive" : "default"}>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="dayOfWeek">Day</Label>
              <Select name="dayOfWeek" defaultValue="1">
                <SelectTrigger id="dayOfWeek" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="startTime">From</Label>
                <Input id="startTime" name="startTime" type="time" defaultValue="08:00" className="h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="endTime">To</Label>
                <Input id="endTime" name="endTime" type="time" defaultValue="17:00" className="h-11" />
              </div>
            </div>
            <Button type="submit" disabled={isPending} variant="outline" className="h-11">
              {isPending ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Add availability
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
