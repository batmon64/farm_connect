const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatBudget(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  const suffix = type && type !== "fixed" ? ` / ${budgetTypeLabel(type)}` : "";
  if (min != null && max != null && min !== max) {
    return `${currency.format(min)}–${currency.format(max)}${suffix}`;
  }
  if (min != null) return `${currency.format(min)}${suffix}`;
  if (max != null) return `${currency.format(max)}${suffix}`;
  return "Budget flexible";
}

export function budgetTypeLabel(type: string | null): string {
  switch (type) {
    case "per_acre":
      return "acre";
    case "per_hour":
      return "hour";
    case "per_day":
      return "day";
    case "negotiable":
      return "negotiable";
    default:
      return "job";
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return "Flexible";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Flexible";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return "< 1 km away";
  return `${km.toFixed(1)} km away`;
}

export function formatDuration(interval: string | null): string | null {
  if (!interval) return null;
  // Postgres interval text form, e.g. "03:00:00" or "1 day 02:00:00".
  const hoursMatch = interval.match(/(\d+):(\d+):\d+$/);
  const dayMatch = interval.match(/(\d+) day/);
  const parts: string[] = [];
  if (dayMatch) parts.push(`${dayMatch[1]}d`);
  if (hoursMatch) {
    const h = parseInt(hoursMatch[1], 10);
    const m = parseInt(hoursMatch[2], 10);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
  }
  return parts.length ? parts.join(" ") : interval;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export const JOB_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  posted: "Posted",
  matching: "Finding providers",
  offers_received: "Offers received",
  provider_selected: "Provider selected",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};
