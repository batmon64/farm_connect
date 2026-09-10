import { Badge } from "@/components/ui/badge";

export default function FarmerPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
      <Badge variant="secondary" className="w-fit">
        Coming soon
      </Badge>
      <h1 className="text-2xl font-semibold">Farmer experience</h1>
      <p className="text-muted-foreground">
        This is where farmers will post farm jobs, browse providers, and
        manage bookings. Not built yet — this phase only establishes the
        application shell.
      </p>
    </div>
  );
}
