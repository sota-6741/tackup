import type {
  CheckBoardAccessInput,
  CheckBoardAccessResult,
} from "@/modules/board/application/check-board-access";
import { ROLES } from "@/modules/board/domain/board-member";
import { isEditable } from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  checkBoardAccess: (
    input: CheckBoardAccessInput,
  ) => Promise<CheckBoardAccessResult>;
  postRepository: PostRepository;
  fileStorage: FileStorage;
};

export type GetEditablePostInput = {
  boardId: string;
  publicId: string;
  userId: string;
};

/** 編集の画面に渡す形。内部の ID とストレージのキーは含めない。 */
export type EditablePostView = {
  publicId: string;
  boardId: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  publishFrom: Date;
  /** 無期限なら `null`。 */
  expiresAt: Date | null;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

/**
 * `post_not_found` は、掲示物がない・ほかの掲示板の掲示物・メンバーでない、のどれか。掲示物があるかどうかを知らせないため、区別しない。
 * `post_not_editable` は、撤去済みのとき。
 */
export type GetEditablePostResult =
  | { ok: true; post: EditablePostView }
  | { ok: false; reason: "post_not_found" | "post_not_editable" };

/** 編集の画面に出す、今の値。URL の掲示板と掲示物が食い違っていれば、見つからないとして扱う。 */
export function makeGetEditablePost({
  checkBoardAccess,
  postRepository,
  fileStorage,
}: Deps) {
  return async function getEditablePost({
    boardId,
    publicId,
    userId,
  }: GetEditablePostInput): Promise<GetEditablePostResult> {
    const post = await postRepository.findByPublicId(publicId);
    if (!post || post.boardId !== boardId) {
      return { ok: false, reason: "post_not_found" };
    }
    const access = await checkBoardAccess({ boardId, userId, roles: ROLES });
    if (!access.ok) return { ok: false, reason: "post_not_found" };
    if (!isEditable(post)) return { ok: false, reason: "post_not_editable" };

    return {
      ok: true,
      post: {
        publicId: post.publicId,
        boardId: post.boardId,
        title: post.title,
        description: post.description,
        externalUrl: post.externalUrl,
        publishFrom: post.publishFrom,
        expiresAt: post.expiresAt,
        thumbnailUrl: await fileStorage.createDownloadUrl(post.thumbnailKey),
        thumbnailWidth: post.thumbnailWidth,
        thumbnailHeight: post.thumbnailHeight,
      },
    };
  };
}
