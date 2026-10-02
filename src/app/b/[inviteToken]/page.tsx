import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listPublicBoardPosts } from "@/di/post";
import { PostBoard } from "@/modules/post/presentation/post-board";

/** 招待リンクを知っている人だけが開けるページなので、検索エンジンには載せない。 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicBoardPage({
  params,
  searchParams,
}: PageProps<"/b/[inviteToken]">) {
  const { inviteToken } = await params;
  const { after } = await searchParams;
  const result = await listPublicBoardPosts({
    inviteToken,
    cursor: typeof after === "string" ? after : undefined,
  });
  if (!result.ok) notFound();

  const boardPath = `/b/${encodeURIComponent(inviteToken)}`;
  // 続きのページが空になったときは、最初のページへ戻す。
  if (result.isContinuation && result.posts.length === 0) redirect(boardPath);

  return (
    <main className="flex flex-col gap-8 px-6 py-8">
      <h1 className="break-words font-semibold text-2xl tracking-tight">
        {result.boardName}
      </h1>
      <PostBoard
        posts={result.posts}
        nextHref={
          result.nextCursor &&
          `${boardPath}?after=${encodeURIComponent(result.nextCursor)}`
        }
      />
    </main>
  );
}
