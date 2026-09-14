import { Button } from "@/components/ui/button";
import { logOutAction } from "../actions";

export function LogoutButton({
  variant = "outline",
  className,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  return (
    <form action={logOutAction}>
      <Button type="submit" variant={variant} className={className}>
        Log out
      </Button>
    </form>
  );
}
