import {
  canIssueQrCode,
  postDisplayState,
} from "@/modules/post/domain/post-access";
import type {
  FindAccessiblePostInput,
  FindAccessiblePostResult,
} from "./find-accessible-post";

type Deps = {
  findAccessiblePost: (
    input: FindAccessiblePostInput,
  ) => Promise<FindAccessiblePostResult>;
  /** 文字列を QR コードの SVG にする。 */
  generateQrCodeSvg: (text: string) => Promise<string>;
  appBaseUrl: string;
};

/** `post_not_found` は、掲示物がない・メンバーでない・QR コードを出せない状態（撤去済み・下書き）のどれか。区別しない。 */
export type GetPostQrCodeResult =
  | { ok: true; svg: string }
  | { ok: false; reason: "post_not_found" };

/** 掲示物詳細の URL の QR コード。印刷して貼るためのものなので、その掲示板のメンバーにだけ出す。 */
export function makeGetPostQrCode({
  findAccessiblePost,
  generateQrCodeSvg,
  appBaseUrl,
}: Deps) {
  return async function getPostQrCode(
    input: FindAccessiblePostInput,
  ): Promise<GetPostQrCodeResult> {
    const found = await findAccessiblePost(input);
    if (!found.ok || !found.isMember) {
      return { ok: false, reason: "post_not_found" };
    }
    const { post, now } = found;
    if (!canIssueQrCode(postDisplayState(post, now))) {
      return { ok: false, reason: "post_not_found" };
    }

    const url = new URL(`/posts/${post.publicId}`, appBaseUrl);
    return { ok: true, svg: await generateQrCodeSvg(url.toString()) };
  };
}
