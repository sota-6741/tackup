import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { listRemovalTasks } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import { RemovalTaskList } from "@/modules/post/presentation/removal-task-list";

export default async function RemovalTasksPage({
  params,
  searchParams,
}: PageProps<"/boards/[boardId]/removals">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const { after } = await searchParams;
  const userId = session.user.id;
  const [result, tasks] = await Promise.all([
    getBoard({ boardId, userId }),
    listRemovalTasks({
      boardId,
      userId,
      cursor: typeof after === "string" ? after : undefined,
    }),
  ]);
  if (!result.ok || !tasks.ok) notFound();
  // 続きのページが空になった（前のページを開いたあとに、残りが撤去済みになったなど）ときは、最初のページへ戻す。
  if (tasks.isContinuation && tasks.tasks.length === 0) {
    redirect(`/boards/${boardId}/removals`);
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
        <h1 className="font-semibold text-2xl tracking-tight">撤去タスク</h1>
        <p className="text-muted-foreground text-sm">
          掲示終了を過ぎた掲示物です。掲示終了の古い順に並びます。
        </p>
      </header>
      <RemovalTaskList
        tasks={tasks.tasks}
        now={tasks.now}
        nextHref={
          tasks.nextCursor &&
          `/boards/${board.id}/removals?after=${encodeURIComponent(tasks.nextCursor)}`
        }
      />
    </div>
  );
}
