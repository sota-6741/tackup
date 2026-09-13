import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/presentation/session";

export default async function BoardsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // TODO: 一番最初のボードを取ってくる関数
  const board = null as { id: string } | null;

  if (!board) redirect("/boards/new");

  redirect(`/boards/${board.id}`);
}
