import { Check, X, Sparkles, ThumbsUp, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MatchFacts, MatchTier } from "@/types/marketplace";

const TIER_LABEL: Record<Exclude<MatchTier, null>, string> = {
  strong: "Strong match",
  good: "Good match",
  fair: "Fair match",
};

const TIER_ICON: Record<Exclude<MatchTier, null>, typeof Sparkles> = {
  strong: Sparkles,
  good: ThumbsUp,
  fair: CircleDot,
};

/** Deterministic SQL ordering, presented plainly — never call this "AI"
 * or show a bare percentage. See job_match_tier() (Phase 7). */
export function MatchTierBadge({ tier }: { tier: MatchTier }) {
  if (!tier) return null;
  const Icon = TIER_ICON[tier];
  return (
    <Badge variant={tier === "strong" ? "default" : "secondary"} className="gap-1">
      <Icon className="size-3" aria-hidden />
      {TIER_LABEL[tier]}
    </Badge>
  );
}

type FactItem = { label: string; ok: boolean };

/** Only facts that are actually known (non-null) are shown — an
 * unfilled availability section or a job with no machine/worker
 * requirement is silently omitted rather than presented as a
 * negative. Every item traces to a real column; nothing here is
 * estimated or fabricated. */
export function matchFactItems(facts: MatchFacts): FactItem[] {
  const items: FactItem[] = [];
  if (facts.schedule_available != null) {
    items.push({ label: "Available at requested time", ok: facts.schedule_available });
  }
  if (facts.has_workload_conflict != null) {
    items.push({ label: "No scheduling conflict", ok: !facts.has_workload_conflict });
  }
  if (facts.within_service_radius != null) {
    items.push({ label: "Within service radius", ok: facts.within_service_radius });
  }
  if (facts.machine_match != null) {
    items.push({ label: "Required machine available", ok: facts.machine_match });
  }
  if (facts.worker_match != null) {
    items.push({ label: "Enough workers available", ok: facts.worker_match });
  }
  if (facts.budget_fit != null) {
    items.push({ label: "Fits stated budget", ok: facts.budget_fit });
  }
  return items;
}

export function MatchFactList({ facts }: { facts: MatchFacts }) {
  const items = matchFactItems(facts);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-1.5 text-xs ${item.ok ? "text-foreground" : "text-muted-foreground"}`}
        >
          {item.ok ? (
            <Check className="text-primary size-3.5 shrink-0" aria-hidden />
          ) : (
            <X className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
