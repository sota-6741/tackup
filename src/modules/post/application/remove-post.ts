import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import type { PostRepository } from "@/modules/post/domain/post-repository";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  postRepository: PostRepository;
  now: () => Date;
};

export type RemovePostInput = {
  publicId: string;
  userId: string;
};

/**
 * `post_not_found` は、掲示物がない場合と、その掲示板のメンバーでない場合の両方。掲示物があるかどうかを知らせないため、区別しない。
 * `post_not_removable` は、下書きなど、撤去済みにできない状態のとき。
 */
export type RemovePostResult =
  | { ok: true; boardId: string }
  | { ok: false; reason: "post_not_found" | "post_not_removable" };

/**
 * 掲示物を撤去済みにする。実際の掲示物をはがしたあとに、メンバーが記録する。
 * 期限切れかどうかは問わない（無期限の掲示物・期限前の掲示物も、撤去済みにできる）。
 * すでに撤去済みなら、何もせずに成功を返す。2 人が同時に押しても、どちらも成功になる。
 */
export function makeRemovePost({
  checkBoardAccess,
  postRepository,
  now,
}: Deps) {
  return async function removePost({
    publicId,
    userId,
  }: RemovePostInput): Promise<RemovePostResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post) return { ok: false, reason: "post_not_found" };

    const access = await checkBoardAccess({
      boardId: post.boardId,
      userId,
      roles: ROLES,
    });
    if (!access.ok) return { ok: false, reason: "post_not_found" };

    if (post.status === "removed") return { ok: true, boardId: post.boardId };
    if (post.status !== "published") {
      return { ok: false, reason: "post_not_removable" };
    }

    // `false`（ほかの人が先に撤去済みにした）でも、望んだ状態になっているので成功にする。
    await postRepository.markRemoved({
      id: post.id,
      removedAt: now(),
      removedBy: userId,
    });
    return { ok: true, boardId: post.boardId };
  };
}
