import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/presentation/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  redirect("/boards");
}
