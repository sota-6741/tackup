import Link from "next/link";
import type { LedgerPostView } from "@/modules/post/application/list-ledger-posts";
import type { PostDisplayState } from "@/modules/post/domain/post-access";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { buttonVariants } from "@/shared/presentation/components/ui/button";
import { LocalDateTime } from "./local-date-time";
import { RemovePostButton } from "./remove-post-button";

const STATE_LABELS: Record<PostDisplayState, string> = {
  draft: "下書き",
  upcoming: "掲示開始前",
  published: "公開中",
  expired: "期限切れ・撤去待ち",
  removed: "撤去済み",
};

type PostLedgerProps = {
  posts: LedgerPostView[];
  /** 続きのページの URL。続きがなければ `null`。 */
  nextHref: string | null;
};

/** 掲示板のすべての掲示物を、状態を付けて並べる。サムネイルは、掲示板ボードと同じ理由で遅延読み込みにしない。 */
export function PostLedger({ posts, nextHref }: PostLedgerProps) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground text-sm">
        まだ掲示物はありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col divide-y rounded-md border">
        {posts.map((post) => (
          <li
            key={post.publicId}
            className="flex flex-wrap items-center gap-4 p-4"
          >
            {/* biome-ignore lint/performance/noImgElement: 署名付きの URL は毎回変わるので、next/image で最適化しない */}
            <img
              src={post.thumbnailUrl}
              alt=""
              width={post.thumbnailWidth}
              height={post.thumbnailHeight}
              className="size-16 shrink-0 rounded-md border bg-muted object-cover"
            />
            <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* 先読みはしない。掲示板ボードのタイルと同じ理由。 */}
                <Link
                  href={`/posts/${post.publicId}`}
                  prefetch={false}
                  className="break-words font-medium underline-offset-4 hover:underline"
                >
                  {post.title}
                </Link>
                <Badge
                  variant={
                    post.state === "expired" ? "destructive" : "secondary"
                  }
                >
                  {STATE_LABELS[post.state]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                掲示期間: <LocalDateTime iso={post.publishFrom.toISOString()} />{" "}
                〜{" "}
                {post.expiresAt ? (
                  <LocalDateTime iso={post.expiresAt.toISOString()} />
                ) : (
                  "無期限"
                )}
              </p>
              {post.removedAt && (
                <p className="text-muted-foreground text-sm">
                  撤去: <LocalDateTime iso={post.removedAt.toISOString()} />
                </p>
              )}
            </div>
            {post.canRemove && (
              <RemovePostButton publicId={post.publicId} title={post.title} />
            )}
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
