import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import type { PostDetail as PostDetailData } from "@/modules/post/application/get-post-detail";
import type { PostDisplayState } from "@/modules/post/domain/post-access";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { buttonVariants } from "@/shared/presentation/components/ui/button";
import { LocalDateTime } from "./local-date-time";
import { ShareButton } from "./share-button";

/** 公開中でない掲示物を見られるのはメンバーだけなので、メンバーに状態を知らせる。 */
const STATE_LABELS: Record<Exclude<PostDisplayState, "published">, string> = {
  draft: "下書き",
  upcoming: "掲示開始前",
  expired: "掲示期間は終了しています",
  removed: "撤去済み",
};

export function PostDetail({ post }: { post: PostDetailData }) {
  const originalPath = `/posts/${post.publicId}/original`;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      {post.boardId && (
        <Link
          href={`/boards/${post.boardId}`}
          className="self-start text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          掲示板へ戻る
        </Link>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="break-words font-semibold text-2xl tracking-tight">
          {post.title}
        </h1>
        {post.state !== "published" && (
          <Badge variant="secondary" className="self-start">
            {STATE_LABELS[post.state]}
          </Badge>
        )}
        <p className="text-muted-foreground text-sm">
          掲示期間: <LocalDateTime iso={post.publishFrom.toISOString()} /> 〜{" "}
          {post.expiresAt ? (
            <LocalDateTime iso={post.expiresAt.toISOString()} />
          ) : (
            "無期限"
          )}
        </p>
      </header>

      {/* biome-ignore lint/performance/noImgElement: 署名付きの URL は毎回変わるので、next/image で最適化しない */}
      <img
        src={post.image.url}
        alt={post.title}
        {...("width" in post.image
          ? { width: post.image.width, height: post.image.height }
          : {})}
        className="h-auto max-w-full self-center rounded-md border bg-muted"
      />

      <div className="flex flex-wrap gap-2">
        {post.isPdf && (
          <a
            href={originalPath}
            target="_blank"
            rel="noopener"
            className={buttonVariants()}
          >
            <FileTextIcon />
            PDF を開く
          </a>
        )}
        <a
          href={`${originalPath}?download=1`}
          className={buttonVariants({ variant: "outline" })}
        >
          <DownloadIcon />
          保存する
        </a>
        <ShareButton title={post.title} />
      </div>

      {post.description && (
        <p className="whitespace-pre-wrap break-words">{post.description}</p>
      )}

      {post.externalUrl && (
        <a
          href={post.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 break-all text-sm underline underline-offset-4"
        >
          <ExternalLinkIcon className="size-4 shrink-0" />
          {post.externalUrl}
        </a>
      )}
    </article>
  );
}
