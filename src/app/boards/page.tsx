import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findLandingBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import { LAST_BOARD_COOKIE } from "@/modules/board/presentation/last-board-cookie";

export default async function BoardsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const cookieStore = await cookies();
  const lastBoardId = cookieStore.get(LAST_BOARD_COOKIE)?.value;

  const board = await findLandingBoard({
    userId: session.user.id,
    lastBoardId,
  });
  if (!board) redirect("/boards/new");

  redirect(`/boards/${board.id}`);
}
