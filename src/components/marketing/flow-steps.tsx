import type { LucideIcon } from "lucide-react";

export type FlowStep = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FlowSteps({ title, steps }: { title: string; steps: FlowStep[] }) {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ol className="grid gap-4 md:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="border-border/60 relative flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                <step.icon className="size-4" aria-hidden />
              </span>
              <span className="text-muted-foreground text-xs font-semibold tracking-wide">
                STEP {i + 1}
              </span>
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
