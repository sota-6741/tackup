import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { listPosts } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import { PostList } from "@/modules/post/presentation/post-list";

export default async function PostListPage({
  params,
  searchParams,
}: PageProps<"/boards/[boardId]/posts">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const { after } = await searchParams;
  const userId = session.user.id;
  const [result, list] = await Promise.all([
    getBoard({ boardId, userId }),
    listPosts({
      boardId,
      userId,
      cursor: typeof after === "string" ? after : undefined,
    }),
  ]);
  if (!result.ok || !list.ok) notFound();
  // 続きのページが空になった（前のページを開いたあとに、掲示開始を変えたなど）ときは、最初のページへ戻す。
  if (list.isContinuation && list.posts.length === 0) {
    redirect(`/boards/${boardId}/posts`);
  }
  const { board } = result;

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href={`/boards/${board.id}`}
          className="self-start break-words text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {board.name}
        </Link>
        <h1 className="font-semibold text-2xl tracking-tight">掲示物一覧</h1>
        <p className="text-muted-foreground text-sm">
          過去の掲示物も含めた、この掲示板のすべての掲示物です。掲示開始の新しい順に並びます。
        </p>
      </header>
      <PostList
        boardId={board.id}
        posts={list.posts}
        nextHref={
          list.nextCursor &&
          `/boards/${board.id}/posts?after=${encodeURIComponent(list.nextCursor)}`
        }
      />
    </div>
  );
}
