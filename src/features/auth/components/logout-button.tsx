import { Button } from "@/components/ui/button";
import { logOutAction } from "../actions";

export function LogoutButton({
  variant = "outline",
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <form action={logOutAction}>
      <Button type="submit" variant={variant}>
        Log out
      </Button>
    </form>
  );
}
