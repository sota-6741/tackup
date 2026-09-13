"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/presentation/components/ui/button";
import { signOut } from "./auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={() =>
        signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
      }
    >
      サインアウト
    </Button>
  );
}
