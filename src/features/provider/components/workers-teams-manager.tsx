"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  addTeamAction,
  addTeamWorkerAction,
  addWorkerAction,
  removeTeamWorkerAction,
  toggleWorkerAction,
} from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import type { Team, Worker } from "@/types/marketplace";

type ListedTeam = Team & { team_workers: { worker_id: string; workers: { name: string } | null }[] };

export function WorkersTeamsManager({
  workers,
  teams,
}: {
  workers: Worker[];
  teams: ListedTeam[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="font-heading font-semibold">Workers</h3>
        {workers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No workers added yet."
            description="Workers don't need a FarmConnect account — just add their name here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {workers.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    {w.worker_type ? (
                      <p className="text-muted-foreground text-sm">{w.worker_type}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={w.is_active ? "secondary" : "outline"}>
                      {w.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <form action={toggleWorkerAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="isActive" value={String(w.is_active)} />
                      <Button type="submit" variant="outline" size="sm">
                        {w.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <AddWorkerForm />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-heading font-semibold">Teams</h3>
        {teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teams yet."
            description="Group your workers into teams for larger jobs."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} workers={workers} />
            ))}
          </div>
        )}
        <AddTeamForm />
      </section>
    </div>
  );
}

function AddWorkerForm() {
  const [state, formAction, isPending] = useActionState(addWorkerAction, initialMarketplaceFormState);
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={formAction} className="flex flex-col gap-3">
          {state.message ? (
            <Alert variant={state.status === "error" ? "destructive" : "default"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Input name="name" placeholder="Worker name" className="h-11" />
            <Input name="workerType" placeholder="Role (optional)" className="h-11" />
          </div>
          <Button type="submit" disabled={isPending} variant="outline" className="h-11">
            {isPending ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            Add worker
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddTeamForm() {
  const [state, formAction, isPending] = useActionState(addTeamAction, initialMarketplaceFormState);
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={formAction} className="flex flex-col gap-3">
          {state.message ? (
            <Alert variant={state.status === "error" ? "destructive" : "default"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Input name="name" placeholder="Team name" className="h-11" />
          <Button type="submit" disabled={isPending} variant="outline" className="h-11">
            {isPending ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            Add team
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TeamCard({ team, workers }: { team: ListedTeam; workers: Worker[] }) {
  const [selected, setSelected] = useState("");
  const memberIds = new Set(team.team_workers.map((tw) => tw.worker_id));
  const available = workers.filter((w) => !memberIds.has(w.id));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <p className="font-medium">{team.name}</p>
        <div className="flex flex-wrap gap-2">
          {team.team_workers.map((tw) => (
            <form key={tw.worker_id} action={removeTeamWorkerAction}>
              <input type="hidden" name="teamId" value={team.id} />
              <input type="hidden" name="workerId" value={tw.worker_id} />
              <button
                type="submit"
                className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-3 py-1 text-sm"
              >
                {tw.workers?.name}
                <X className="size-3" aria-hidden />
              </button>
            </form>
          ))}
        </div>
        {available.length > 0 ? (
          <form action={addTeamWorkerAction} className="flex items-center gap-2">
            <input type="hidden" name="teamId" value={team.id} />
            <input type="hidden" name="workerId" value={selected} />
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-10 flex-1">
                <SelectValue placeholder="Add a worker" />
              </SelectTrigger>
              <SelectContent>
                {available.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" variant="outline" disabled={!selected}>
              Add
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
