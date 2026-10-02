import type { Board } from "@/modules/board/domain/board";
import type { BoardRepository } from "@/modules/board/domain/board-repository";
import type { Post } from "@/modules/post/domain/post";
import { decidePostAccess } from "@/modules/post/domain/post-access";
import type { PostRepository } from "@/modules/post/domain/post-repository";

type Deps = {
  postRepository: PostRepository;
  boardRepository: BoardRepository;
  now: () => Date;
};

export type FindAccessiblePostInput = {
  publicId: string;
  /** ログインしていなければ `null`。 */
  userId: string | null;
};

/**
 * `post_not_found` は、掲示物がない場合と、あっても見せない場合の両方。掲示物があるかどうかを知らせないため、区別しない。
 * `sign_in_required` は、非公開の掲示板の掲示物を、ログインしていない人が開いた場合。
 */
export type FindAccessiblePostResult =
  | { ok: true; post: Post; board: Board; isMember: boolean; now: Date }
  | { ok: false; reason: "post_not_found" | "sign_in_required" };

/**
 * 公開の ID から掲示物を探し、見てよいかを確かめる。
 * 掲示物詳細・原本のファイル・QR コードは、掲示物を直接探さずに、必ずこれを通す。画面からは直接呼ばせない（`src/di` から出さない）。
 */
export function makeFindAccessiblePost({
  postRepository,
  boardRepository,
  now,
}: Deps) {
  return async function findAccessiblePost({
    publicId,
    userId,
  }: FindAccessiblePostInput): Promise<FindAccessiblePostResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post) return { ok: false, reason: "post_not_found" };

    const [board, member] = await Promise.all([
      boardRepository.findById(post.boardId),
      userId === null ? null : boardRepository.findMember(post.boardId, userId),
    ]);
    if (!board) return { ok: false, reason: "post_not_found" };

    const current = now();
    const isMember = member !== null;
    const access = decidePostAccess({
      post,
      board,
      isMember,
      isSignedIn: userId !== null,
      now: current,
    });
    if (access === "allowed") {
      return { ok: true, post, board, isMember, now: current };
    }
    return {
      ok: false,
      reason: access === "not_found" ? "post_not_found" : access,
    };
  };
}
