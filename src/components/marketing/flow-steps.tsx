export type FlowStep = {
  title: string;
  description: string;
};

export function FlowSteps({ title, steps }: { title?: string; steps: FlowStep[] }) {
  return (
    <div className="flex flex-col gap-6">
      {title ? (
        <h3 className="font-heading text-xl font-semibold sm:text-2xl">{title}</h3>
      ) : null}
      <ol className="relative grid gap-8 border-t border-border sm:grid-cols-2 sm:gap-x-6 md:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2.5 pt-5">
            <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Step {String(i + 1).padStart(2, "0")}
            </span>
            <p className="font-heading text-lg font-semibold">{step.title}</p>
            <p className="text-muted-foreground max-w-[32ch] text-sm leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
