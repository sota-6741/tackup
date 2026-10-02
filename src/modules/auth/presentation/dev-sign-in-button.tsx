import { Button } from "@/shared/presentation/components/ui/button";
import { devSignInAction } from "./dev-sign-in-action";

export function DevSignInButton() {
  return (
    <form action={devSignInAction}>
      <Button type="submit" variant="outline">
        開発用ユーザーでサインイン
      </Button>
    </form>
  );
}
