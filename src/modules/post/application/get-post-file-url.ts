import { originalFileName } from "@/modules/post/domain/post-access";
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

export type GetPostFileUrlInput = FindAccessiblePostInput & {
  /** `open` はブラウザで開く。`save` は、タイトルを付けたファイル名で保存させる。 */
  mode: "open" | "save";
};

export type GetPostFileUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: "post_not_found" | "sign_in_required" };

/**
 * 原本の署名付きの URL を、開くたびに発行する。
 * 掲示物詳細に URL を直接置くと、ページを開いたまま数分たつと期限が切れて開けなくなる。
 */
export function makeGetPostFileUrl({ findAccessiblePost, fileStorage }: Deps) {
  return async function getPostFileUrl({
    mode,
    ...input
  }: GetPostFileUrlInput): Promise<GetPostFileUrlResult> {
    const found = await findAccessiblePost(input);
    if (!found.ok) return found;
    const { post } = found;

    const url =
      mode === "save"
        ? await fileStorage.createSaveUrl({
            key: post.originalKey,
            fileName: originalFileName(post),
          })
        : await fileStorage.createDownloadUrl(post.originalKey);
    return { ok: true, url };
  };
}
