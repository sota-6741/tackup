import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/presentation/session";
import { SignInButton } from "@/modules/auth/presentation/sign-in-button";

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-semibold text-2xl">サインイン</h1>
      <SignInButton />
    </main>
  );
}
