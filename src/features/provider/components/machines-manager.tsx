"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { addMachineAction, toggleMachineAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import type { Machine, Service } from "@/types/marketplace";

type ListedMachine = Machine & {
  machine_services: { service_id: string; services: { name: string } | null }[];
};

export function MachinesManager({
  machines,
  services,
}: {
  machines: ListedMachine[];
  services: Service[];
}) {
  const [state, formAction, isPending] = useActionState(addMachineAction, initialMarketplaceFormState);
  const [open, setOpen] = useState(machines.length === 0);

  return (
    <div className="flex flex-col gap-5">
      {machines.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title="No machines added yet."
          description="Add tractors, brush cutters, or other equipment you can offer for jobs."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {machines.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {[m.machine_type, m.brand, m.model].filter(Boolean).join(" · ") || "—"}
                    {m.quantity > 1 ? ` · ${m.quantity} units` : ""}
                  </p>
                  {m.machine_services.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.machine_services.map((ms) => (
                        <Badge key={ms.service_id} variant="outline" className="text-xs">
                          {ms.services?.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.is_active ? "secondary" : "outline"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <form action={toggleMachineAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="isActive" value={String(m.is_active)} />
                    <Button type="submit" variant="outline" size="sm">
                      {m.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="h-11">
          <Plus className="size-4" aria-hidden />
          Add machine
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <form action={formAction} className="flex flex-col gap-4">
              {state.message ? (
                <Alert variant={state.status === "error" ? "destructive" : "default"}>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="machineName">Name</Label>
                <Input
                  id="machineName"
                  name="name"
                  className="h-11"
                  placeholder="e.g. Mahindra 275 DI"
                  aria-invalid={Boolean(state.fieldErrors?.name)}
                  aria-describedby={state.fieldErrors?.name ? "machineName-error" : undefined}
                />
                {state.fieldErrors?.name ? (
                  <p id="machineName-error" className="text-destructive text-sm">
                    {state.fieldErrors.name[0]}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="machineType">Type</Label>
                  <Input id="machineType" name="machineType" className="h-11" placeholder="Tractor" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand">Brand (optional)</Label>
                  <Input id="brand" name="brand" className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="model">Model (optional)</Label>
                  <Input id="model" name="model" className="h-11" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="serviceId">Can support (optional)</Label>
                <Select name="serviceId">
                  <SelectTrigger id="serviceId" className="h-11 w-full">
                    <SelectValue placeholder="Link a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isPending} className="h-11">
                {isPending ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                ) : null}
                Add machine
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
