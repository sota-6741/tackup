import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import {
  isEditable,
  type PostTitleError,
  type PublishPeriodError,
  parsePostDescription,
  parsePostExternalUrl,
  parsePostTitle,
  parsePublishPeriod,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  postRepository: PostRepository;
};

export type UpdatePostInput = {
  publicId: string;
  userId: string;
  title: string;
  /** 空なら、説明文なし。 */
  description: string;
  /** 空なら、外部リンクなし。 */
  externalUrl: string;
  publishFrom: Date;
  expiresAt: Date | null;
};

/**
 * `post_not_found` は、掲示物がない場合と、その掲示板のメンバーでない場合の両方。
 * `post_not_editable` は、撤去済みのとき（編集の画面を開いたあとに、ほかの人が撤去済みにした場合を含む）。
 */
export type UpdatePostResult =
  | { ok: true; boardId: string }
  | {
      ok: false;
      reason:
        | "post_not_found"
        | "post_not_editable"
        | PostTitleError
        | PublishPeriodError
        | "description_too_long"
        | "external_url_invalid";
    };

/** タイトル・説明文・外部リンク・掲示期間を書き換える。決まりは登録と同じ。同時に編集されたときは、あとから保存したほうが残る。 */
export function makeUpdatePost({ checkBoardAccess, postRepository }: Deps) {
  return async function updatePost({
    publicId,
    userId,
    title,
    description,
    externalUrl,
    publishFrom,
    expiresAt,
  }: UpdatePostInput): Promise<UpdatePostResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post) return { ok: false, reason: "post_not_found" };
    const access = await checkBoardAccess({
      boardId: post.boardId,
      userId,
      roles: ROLES,
    });
    if (!access.ok) return { ok: false, reason: "post_not_found" };
    if (!isEditable(post)) return { ok: false, reason: "post_not_editable" };

    const postTitle = parsePostTitle(title);
    if (!postTitle.ok) return postTitle;
    const postDescription = parsePostDescription(description);
    if (!postDescription.ok) return postDescription;
    const postExternalUrl = parsePostExternalUrl(externalUrl);
    if (!postExternalUrl.ok) return postExternalUrl;
    const period = parsePublishPeriod({ publishFrom, expiresAt });
    if (!period.ok) return period;

    const updated = await postRepository.update({
      id: post.id,
      title: postTitle.title,
      description: postDescription.description,
      externalUrl: postExternalUrl.externalUrl,
      publishFrom: period.publishFrom,
      expiresAt: period.expiresAt,
    });
    if (!updated) return { ok: false, reason: "post_not_editable" };
    return { ok: true, boardId: post.boardId };
  };
}
