import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import { ThumbnailPreview } from "@/modules/post/presentation/thumbnail-preview";

export default async function NewPostPage({
  params,
}: PageProps<"/boards/[boardId]/posts/new">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { boardId } = await params;
  const result = await getBoard({ boardId, userId: session.user.id });
  if (!result.ok) notFound();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
      <h1 className="font-semibold text-2xl tracking-tight">掲示物を登録</h1>
      <ThumbnailPreview />
    </div>
  );
}
