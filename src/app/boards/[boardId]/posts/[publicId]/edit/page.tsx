import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEditablePost } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import { EditPostForm } from "@/modules/post/presentation/edit-post-form";
import { ReplaceOriginalForm } from "@/modules/post/presentation/replace-original-form";

export default async function EditPostPage({
  params,
}: PageProps<"/boards/[boardId]/posts/[publicId]/edit">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId, publicId } = await params;
  const result = await getEditablePost({
    boardId,
    publicId,
    userId: session.user.id,
  });
  if (!result.ok) notFound();
  const { post } = result;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link
          href={`/boards/${post.boardId}/posts`}
          className="self-start text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          掲示物一覧へ戻る
        </Link>
        <h1 className="font-semibold text-2xl tracking-tight">掲示物を編集</h1>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">ファイル</h2>
        {/* biome-ignore lint/performance/noImgElement: 署名付きの URL は毎回変わるので、next/image で最適化しない */}
        <img
          src={post.thumbnailUrl}
          alt="今のサムネイル"
          width={post.thumbnailWidth}
          height={post.thumbnailHeight}
          className="h-auto max-h-80 w-auto max-w-full self-start rounded-md border"
        />
        <ReplaceOriginalForm publicId={post.publicId} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">内容</h2>
        <EditPostForm
          publicId={post.publicId}
          boardId={post.boardId}
          title={post.title}
          description={post.description}
          externalUrl={post.externalUrl}
          publishFrom={post.publishFrom.toISOString()}
          expiresAt={post.expiresAt?.toISOString() ?? null}
        />
      </section>
    </div>
  );
}
