import Link from "next/link";
import { getSession } from "@/modules/auth/presentation/session";
import { buttonVariants } from "@/shared/presentation/components/ui/button";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-semibold text-3xl tracking-tight">tackup</h1>
      <p className="text-muted-foreground">Next.js + Drizzle + Better Auth</p>
      <Link
        href={session ? "/boards" : "/sign-in"}
        className={buttonVariants()}
      >
        {session ? "ボードへ" : "サインイン"}
      </Link>
    </main>
  );
}
