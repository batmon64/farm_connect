import type { ReactNode } from "react";

export type Rung = {
  title: string;
  description: string;
  bullets: string[];
  vignette: ReactNode;
};

export function JourneyLadder({ rungs }: { rungs: Rung[] }) {
  return (
    <ol className="border-border flex flex-col divide-y divide-border border-t border-b">
      {rungs.map((rung, i) => (
        <li
          key={rung.title}
          className="grid items-center gap-8 py-12 md:grid-cols-[auto_1fr_1fr] md:gap-12"
        >
          <span className="font-heading text-muted-foreground/50 text-4xl font-semibold tabular-nums md:text-5xl">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-xl font-semibold sm:text-2xl">{rung.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{rung.description}</p>
            <ul className="mt-1 flex flex-col gap-1.5">
              {rung.bullets.map((bullet) => (
                <li key={bullet} className="text-foreground/80 flex gap-2.5 text-sm">
                  <span className="bg-primary mt-2 inline-block size-1 shrink-0 rounded-full" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
          <div>{rung.vignette}</div>
        </li>
      ))}
    </ol>
  );
}

export function VignetteCard({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-fc-surface-2 border-border rounded-2xl border p-5">
      <span className="text-muted-foreground mb-3 block font-mono text-[10.5px] tracking-[0.16em] uppercase">
        {eyebrow}
      </span>
      {children}
    </div>
  );
}

export function VignetteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-baseline justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
