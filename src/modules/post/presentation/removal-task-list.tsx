import Link from "next/link";
import type { RemovalTaskView } from "@/modules/post/application/list-removal-tasks";
import { buttonVariants } from "@/shared/presentation/components/ui/button";
import { formatOverdue } from "./format-overdue";
import { LocalDateTime } from "./local-date-time";

type RemovalTaskListProps = {
  tasks: RemovalTaskView[];
  /** 期限超過時間を数える基準の時刻。 */
  now: Date;
  /** 続きのページの URL。続きがなければ `null`。 */
  nextHref: string | null;
};

/** 掲示終了を過ぎた掲示物を、古い順に並べる。サムネイルは、掲示板ボードと同じ理由で遅延読み込みにしない。 */
export function RemovalTaskList({
  tasks,
  now,
  nextHref,
}: RemovalTaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground text-sm">
        撤去が必要な掲示物はありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col divide-y rounded-md border">
        {tasks.map((task) => (
          <li key={task.publicId} className="flex items-center gap-4 p-4">
            {/* biome-ignore lint/performance/noImgElement: 署名付きの URL は毎回変わるので、next/image で最適化しない */}
            <img
              src={task.thumbnailUrl}
              alt=""
              width={task.thumbnailWidth}
              height={task.thumbnailHeight}
              className="size-16 shrink-0 rounded-md border bg-muted object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {/* 先読みはしない。掲示板ボードのタイルと同じ理由。 */}
              <Link
                href={`/posts/${task.publicId}`}
                prefetch={false}
                className="break-words font-medium underline-offset-4 hover:underline"
              >
                {task.title}
              </Link>
              <p className="text-muted-foreground text-sm">
                掲示終了: <LocalDateTime iso={task.expiresAt.toISOString()} />
              </p>
              <p className="text-destructive text-sm">
                {formatOverdue({ expiresAt: task.expiresAt, now })}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {nextHref && (
        <Link
          href={nextHref}
          className={buttonVariants({
            variant: "outline",
            className: "self-center",
          })}
        >
          続きを見る
        </Link>
      )}
    </div>
  );
}
