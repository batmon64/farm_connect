import Link from "next/link";
import { Sprout } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-2 text-sm"
      >
        <Sprout className="text-primary size-5" aria-hidden />
        FarmConnect
      </Link>

      <Card>
        <CardHeader>
          <h1 className="font-heading text-xl leading-snug font-medium">{title}</h1>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>

      {footer ? (
        <div className="text-muted-foreground text-center text-sm">{footer}</div>
      ) : null}
    </div>
  );
}
