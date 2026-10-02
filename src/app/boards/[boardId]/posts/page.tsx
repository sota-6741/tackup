import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { listLedgerPosts } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import { PostLedger } from "@/modules/post/presentation/post-ledger";

export default async function PostLedgerPage({
  params,
  searchParams,
}: PageProps<"/boards/[boardId]/posts">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const { after } = await searchParams;
  const userId = session.user.id;
  const [result, ledger] = await Promise.all([
    getBoard({ boardId, userId }),
    listLedgerPosts({
      boardId,
      userId,
      cursor: typeof after === "string" ? after : undefined,
    }),
  ]);
  if (!result.ok || !ledger.ok) notFound();
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
        <h1 className="font-semibold text-2xl tracking-tight">台帳</h1>
        <p className="text-muted-foreground text-sm">
          この掲示板のすべての掲示物です。掲示開始の新しい順に並びます。
        </p>
      </header>
      <PostLedger
        posts={ledger.posts}
        nextHref={
          ledger.nextCursor &&
          `/boards/${board.id}/posts?after=${encodeURIComponent(ledger.nextCursor)}`
        }
      />
    </div>
  );
}
