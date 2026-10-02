import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPostDetail } from "@/di/post";
import { signInPath } from "@/modules/auth/domain/return-path";
import { getSession } from "@/modules/auth/presentation/session";
import { PostDetail } from "@/modules/post/presentation/post-detail";

/** QR コードや掲示板ボードから開くページなので、検索エンジンには載せない。 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PostPage({
  params,
}: PageProps<"/posts/[publicId]">) {
  const { publicId } = await params;
  const session = await getSession();
  const result = await getPostDetail({
    publicId,
    userId: session?.user.id ?? null,
  });
  if (!result.ok) {
    if (result.reason === "sign_in_required") {
      redirect(signInPath(`/posts/${encodeURIComponent(publicId)}`));
    }
    notFound();
  }

  return <PostDetail post={result.post} />;
}
