import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
      <Icon className="text-muted-foreground size-8" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm">{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
