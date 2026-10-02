import { Button } from "@/shared/presentation/components/ui/button";
import { devSignInAction } from "./dev-sign-in-action";

export function DevSignInButton({ returnPath }: { returnPath: string }) {
  return (
    <form action={devSignInAction}>
      <input type="hidden" name="next" value={returnPath} />
      <Button type="submit" variant="outline">
        開発用ユーザーでサインイン
      </Button>
    </form>
  );
}
