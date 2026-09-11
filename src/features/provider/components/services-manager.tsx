"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2, Wrench } from "lucide-react";
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
import {
  addProviderServiceAction,
  removeProviderServiceAction,
  toggleProviderServiceAction,
} from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import type { Service } from "@/types/marketplace";

type ListedService = {
  id: string;
  service_id: string;
  is_active: boolean;
  min_price: number | null;
  max_price: number | null;
  pricing_unit: string | null;
  services: { name: string; unit_type: string | null } | null;
};

export function ServicesManager({
  services,
  myServices,
}: {
  services: Service[];
  myServices: ListedService[];
}) {
  const [state, formAction, isPending] = useActionState(
    addProviderServiceAction,
    initialMarketplaceFormState
  );
  const [serviceId, setServiceId] = useState("");
  const listedIds = new Set(myServices.map((s) => s.service_id));
  const available = services.filter((s) => !listedIds.has(s.id));

  return (
    <div className="flex flex-col gap-5">
      {myServices.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Add your first service so farmers can find you."
          description="Choose from the services below to start receiving relevant jobs."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {myServices.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="font-medium">{s.services?.name ?? "Service"}</p>
                  <p className="text-muted-foreground text-sm">
                    {s.min_price || s.max_price
                      ? `₹${s.min_price ?? "?"}–${s.max_price ?? "?"} / ${
                          s.pricing_unit || s.services?.unit_type || "job"
                        }`
                      : "Price on request"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.is_active ? "secondary" : "outline"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <form action={toggleProviderServiceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="isActive" value={String(s.is_active)} />
                    <Button type="submit" variant="outline" size="sm">
                      {s.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <form action={removeProviderServiceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="Remove">
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {available.length > 0 ? (
        <Card>
          <CardContent className="pt-5">
            <form action={formAction} className="flex flex-col gap-4">
              {state.message ? (
                <Alert variant={state.status === "error" ? "destructive" : "default"}>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="serviceId">Add a service</Label>
                <Select name="serviceId" value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger id="serviceId" className="h-11 w-full">
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="minPrice">Min price (₹)</Label>
                  <Input id="minPrice" name="minPrice" type="number" min="0" className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="maxPrice">Max price (₹)</Label>
                  <Input id="maxPrice" name="maxPrice" type="number" min="0" className="h-11" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pricingUnit">Pricing unit (optional)</Label>
                <Input id="pricingUnit" name="pricingUnit" className="h-11" placeholder="acre, hour, job" />
              </div>

              <Button type="submit" disabled={isPending || !serviceId} className="h-11">
                {isPending ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Add service
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
