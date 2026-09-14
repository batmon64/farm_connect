import type { LucideIcon } from "lucide-react";

type Tone = "default" | "warn" | "info" | "progress" | "ok";

const TONE_CLASS: Record<Tone, string> = {
  default: "border-border bg-card",
  warn: "border-fc-warn/25 bg-fc-warn/8",
  info: "border-fc-info/25 bg-fc-info/8",
  progress: "border-fc-progress/25 bg-fc-progress/8",
  ok: "border-fc-ok/25 bg-fc-ok/8",
};

const ICON_TONE_CLASS: Record<Tone, string> = {
  default: "text-muted-foreground",
  warn: "text-fc-warn",
  info: "text-fc-info",
  progress: "text-fc-progress",
  ok: "text-fc-ok",
};

/** Small stat tile used on the farmer and provider dashboards. Every
 * value passed in must come from a real query — this component has no
 * opinion on the number, it just presents it consistently. */
export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${TONE_CLASS[tone]}`}>
      {Icon ? <Icon className={`size-4.5 ${ICON_TONE_CLASS[tone]}`} aria-hidden /> : null}
      <span className="font-heading text-2xl font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
