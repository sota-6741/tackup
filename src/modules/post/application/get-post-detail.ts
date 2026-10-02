import {
  type PostDisplayState,
  postDisplayState,
} from "@/modules/post/domain/post-access";
import type { FileStorage } from "@/shared/domain/file-storage";
import type {
  FindAccessiblePostInput,
  FindAccessiblePostResult,
} from "./find-accessible-post";

type Deps = {
  findAccessiblePost: (
    input: FindAccessiblePostInput,
  ) => Promise<FindAccessiblePostResult>;
  fileStorage: FileStorage;
};

/** 画面に渡す形。内部の ID とストレージのキーは含めない。 */
export type PostDetail = {
  publicId: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  publishFrom: Date;
  /** 無期限なら `null`。 */
  expiresAt: Date | null;
  state: PostDisplayState;
  isPdf: boolean;
  /** 画面に出す画像。原本が画像ならその原本、PDF ならサムネイル。 */
  image: { url: string; width: number; height: number } | { url: string };
  /** メンバーにだけ渡す。メンバー向けの掲示板ボードへ戻る導線に使う。 */
  boardId: string | null;
};

export type GetPostDetailResult =
  | { ok: true; post: PostDetail }
  | { ok: false; reason: "post_not_found" | "sign_in_required" };

export function makeGetPostDetail({ findAccessiblePost, fileStorage }: Deps) {
  return async function getPostDetail(
    input: FindAccessiblePostInput,
  ): Promise<GetPostDetailResult> {
    const found = await findAccessiblePost(input);
    if (!found.ok) return found;
    const { post, isMember, now } = found;

    const isPdf = post.originalContentType === "application/pdf";
    const image = isPdf
      ? {
          url: await fileStorage.createDownloadUrl(post.thumbnailKey),
          width: post.thumbnailWidth,
          height: post.thumbnailHeight,
        }
      : { url: await fileStorage.createDownloadUrl(post.originalKey) };

    return {
      ok: true,
      post: {
        publicId: post.publicId,
        title: post.title,
        description: post.description,
        externalUrl: post.externalUrl,
        publishFrom: post.publishFrom,
        expiresAt: post.expiresAt,
        state: postDisplayState(post, now),
        isPdf,
        image,
        boardId: isMember ? post.boardId : null,
      },
    };
  };
}
