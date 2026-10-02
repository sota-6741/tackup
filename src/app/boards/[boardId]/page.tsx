import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { listBoardPosts } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import { BoardHeader } from "@/modules/board/presentation/board-header";
import { RememberLastBoard } from "@/modules/board/presentation/remember-last-board";
import { PostBoard } from "@/modules/post/presentation/post-board";

export default async function BoardPage({
  params,
  searchParams,
}: PageProps<"/boards/[boardId]">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const { after } = await searchParams;
  const userId = session.user.id;
  const [result, posts] = await Promise.all([
    getBoard({ boardId, userId }),
    listBoardPosts({
      boardId,
      userId,
      cursor: typeof after === "string" ? after : undefined,
    }),
  ]);
  if (!result.ok || !posts.ok) notFound();
  // 続きのページが空になった（前のページを開いたあとに、残りの掲示期間が終わったなど）ときは、最初のページへ戻す。
  if (after !== undefined && posts.posts.length === 0) {
    redirect(`/boards/${boardId}`);
  }
  const { board, role, inviteUrl } = result;

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <RememberLastBoard boardId={board.id} />
      <BoardHeader
        boardId={board.id}
        name={board.name}
        isPublic={board.isPublic}
        memberRole={role}
        inviteUrl={inviteUrl}
      />
      <PostBoard
        posts={posts.posts}
        nextHref={
          posts.nextCursor &&
          `/boards/${board.id}?after=${encodeURIComponent(posts.nextCursor)}`
        }
      />
    </div>
  );
}
