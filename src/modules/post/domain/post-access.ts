import { type Board, isOpenToPublic } from "@/modules/board/domain/board";
import { isExpired, isPublished, type Post } from "./post";

/**
 * 掲示物詳細を見てよいか。
 * - `allowed`: 見られる
 * - `sign_in_required`: ログインすれば見られるかもしれない（非公開の掲示板で、ログインしていない）
 * - `not_found`: 見られない。掲示物があるかどうかを知らせないため、存在しない掲示物と同じに扱う
 */
export type PostAccess = "allowed" | "sign_in_required" | "not_found";

/**
 * 掲示物詳細・原本のファイル・QR コード・閲覧の記録が、同じ判定を使う。画面ごとに条件を書かない。
 * メンバーは、公開中でない掲示物（掲示開始前・期限切れなど）も見られる。それ以外の人が見られるのは、公開掲示板の公開中の掲示物だけ。
 */
export function decidePostAccess({
  post,
  board,
  isMember,
  isSignedIn,
  now,
}: {
  post: Pick<Post, "status" | "publishFrom" | "expiresAt">;
  board: Pick<Board, "isPublic">;
  isMember: boolean;
  isSignedIn: boolean;
  now: Date;
}): PostAccess {
  if (isMember) return "allowed";
  if (!isOpenToPublic(board)) {
    return isSignedIn ? "not_found" : "sign_in_required";
  }
  return isPublished(post, now) ? "allowed" : "not_found";
}

/** 台帳と掲示物詳細で見せる状態。`Post.status` だけでなく、日時も見て決める。 */
export type PostDisplayState =
  | "draft"
  | "upcoming"
  | "published"
  | "expired"
  | "removed";

export function postDisplayState(
  post: Pick<Post, "status" | "publishFrom" | "expiresAt">,
  now: Date,
): PostDisplayState {
  if (post.status === "draft") return "draft";
  if (post.status === "removed") return "removed";
  if (isExpired(post, now)) return "expired";
  return isPublished(post, now) ? "published" : "upcoming";
}

const EXTENSIONS: Record<Post["originalContentType"], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 保存するときのファイル名。タイトルに、ファイル名に使えない文字が入っていれば `_` に置き換える。 */
export function originalFileName(
  post: Pick<Post, "title" | "originalContentType">,
): string {
  const name = post.title
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字を取り除くための指定
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
    .trim();
  return `${name || "post"}.${EXTENSIONS[post.originalContentType]}`;
}
