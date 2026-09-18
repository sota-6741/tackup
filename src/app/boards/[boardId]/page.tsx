import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import type { Board } from "@/modules/board/domain/board";
import { BoardHeader } from "@/modules/board/presentation/board-header";
import { RememberLastBoard } from "@/modules/board/presentation/remember-last-board";
import { NotFoundError } from "@/shared/domain/errors";

export default async function BoardPage({
  params,
}: PageProps<"/boards/[boardId]">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const board = await getBoardOrNotFound({
    boardId,
    userId: session.user.id,
  });

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <RememberLastBoard boardId={board.id} />
      <BoardHeader name={board.name} isPublic={board.isPublic} />
      <p className="py-16 text-center text-muted-foreground text-sm">
        まだ掲示物はありません
      </p>
    </div>
  );
}

async function getBoardOrNotFound({
  boardId,
  userId,
}: {
  boardId: string;
  userId: string;
}): Promise<Board> {
  try {
    return await getBoard({ boardId, userId });
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
