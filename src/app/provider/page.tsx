import { Badge } from "@/components/ui/badge";

export default function ProviderPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
      <Badge variant="secondary" className="w-fit">
        Coming soon
      </Badge>
      <h1 className="text-2xl font-semibold">Provider experience</h1>
      <p className="text-muted-foreground">
        This is where providers will set up their profile, list services or
        machinery, and respond to nearby jobs. Not built yet — this phase
        only establishes the application shell.
      </p>
    </div>
  );
}
