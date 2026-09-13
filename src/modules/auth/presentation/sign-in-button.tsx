"use client";

import { Button } from "@/shared/presentation/components/ui/button";
import { signIn } from "./auth-client";

export function SignInButton() {
  return (
    <Button
      onClick={() =>
        signIn.social({ provider: "google", callbackURL: "/boards" })
      }
    >
      Google でサインイン
    </Button>
  );
}
