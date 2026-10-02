import { redirect } from "next/navigation";
import { isDevSignInEnabled } from "@/di/auth";
import { DevSignInButton } from "@/modules/auth/presentation/dev-sign-in-button";
import { getSession } from "@/modules/auth/presentation/session";
import { SignInButton } from "@/modules/auth/presentation/sign-in-button";

export default async function SignInPage() {
  if (await getSession()) redirect("/boards");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-semibold text-2xl">サインイン</h1>
      <SignInButton />
      {isDevSignInEnabled() && <DevSignInButton />}
    </main>
  );
}
