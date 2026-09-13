import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/presentation/session";
import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl">ダッシュボード</h1>
        <SignOutButton />
      </div>
      <p>ようこそ、{session.user.name} さん</p>
    </main>
  );
}
