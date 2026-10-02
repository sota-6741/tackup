import { redirect } from "next/navigation";
import { isDevSignInEnabled } from "@/di/auth";
import { parseReturnPath } from "@/modules/auth/domain/return-path";
import { DevSignInButton } from "@/modules/auth/presentation/dev-sign-in-button";
import { getSession } from "@/modules/auth/presentation/session";
import { SignInButton } from "@/modules/auth/presentation/sign-in-button";

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  // ログインが要るページから来たときは、ログイン後にそのページへ戻す。
  const returnPath = parseReturnPath((await searchParams).next);
  if (await getSession()) redirect(returnPath);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-semibold text-2xl">サインイン</h1>
      <SignInButton returnPath={returnPath} />
      {isDevSignInEnabled() && <DevSignInButton returnPath={returnPath} />}
    </main>
  );
}
