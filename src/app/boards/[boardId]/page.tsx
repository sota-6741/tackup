import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import { BoardHeader } from "@/modules/board/presentation/board-header";
import { RememberLastBoard } from "@/modules/board/presentation/remember-last-board";

export default async function BoardPage({
  params,
}: PageProps<"/boards/[boardId]">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const result = await getBoard({ boardId, userId: session.user.id });
  if (!result.ok) notFound();
  const { board } = result;

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
