import { Card, CardContent } from "@/components/ui/card";

/** Small stat tile used on the farmer and provider dashboards. Every
 * value passed in must come from a real query — this component has no
 * opinion on the number, it just presents it consistently. */
export function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 px-3 py-4 text-center">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}
