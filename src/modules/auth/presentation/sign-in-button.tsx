"use client";

import { Button } from "@/shared/presentation/components/ui/button";
import { signIn } from "./auth-client";

/** `returnPath` は、ログイン後に移動する、このアプリの中のパス。 */
export function SignInButton({ returnPath }: { returnPath: string }) {
  return (
    <Button
      onClick={() =>
        signIn.social({ provider: "google", callbackURL: returnPath })
      }
    >
      Google でサインイン
    </Button>
  );
}
