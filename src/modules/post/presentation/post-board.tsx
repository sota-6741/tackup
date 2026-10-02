import Link from "next/link";
import type { PublishedPostView } from "@/modules/post/application/list-published-posts";
import { buttonVariants } from "@/shared/presentation/components/ui/button";

type PostBoardProps = {
  posts: PublishedPostView[];
  /** 続きのページの URL。続きがなければ `null`。 */
  nextHref: string | null;
};

/** 公開中の掲示物を masonry で並べる。メンバー向けと一般閲覧者向けの両方で使うので、管理用の導線は置かない。 */
export function PostBoard({ posts, nextHref }: PostBoardProps) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground text-sm">
        まだ掲示物はありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="columns-2 gap-4 md:columns-3 xl:columns-4">
        {posts.map((post) => (
          <li key={post.publicId} className="mb-4 break-inside-avoid">
            <figure className="flex flex-col gap-2">
              {/* biome-ignore lint/performance/noImgElement: 署名付きの URL は毎回変わるので、next/image で最適化しない */}
              <img
                src={post.thumbnailUrl}
                alt=""
                width={post.thumbnailWidth}
                height={post.thumbnailHeight}
                loading="lazy"
                className="h-auto w-full rounded-md border bg-muted"
              />
              <figcaption className="break-words text-sm">
                {post.title}
              </figcaption>
            </figure>
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
