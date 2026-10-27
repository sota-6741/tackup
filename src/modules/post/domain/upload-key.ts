const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** アップロード先のキーに掲示板とユーザーを含める。登録のときに、その掲示板のためにその人へ発行したキーであることを、DB に記録を持たずに確かめられる。 */
export function uploadKeyPrefix({
  boardId,
  userId,
}: {
  boardId: string;
  userId: string;
}): string {
  return `pending/${boardId}/${userId}/`;
}

export function isUploadKeyOf({
  key,
  boardId,
  userId,
}: {
  key: string;
  boardId: string;
  userId: string;
}): boolean {
  const prefix = uploadKeyPrefix({ boardId, userId });
  return key.startsWith(prefix) && UUID_PATTERN.test(key.slice(prefix.length));
}

/**
 * 確認を通ったファイルを置く、正式な場所のキー。
 * 原本を差し替えるときは `revision` を渡して、今のファイルと別のキーにする。移すのに失敗しても、今のファイルが残る。
 */
export function postFileKeys({
  boardId,
  postId,
  revision,
}: {
  boardId: string;
  postId: string;
  revision?: string;
}): { originalKey: string; thumbnailKey: string } {
  const prefix = revision
    ? `boards/${boardId}/posts/${postId}/${revision}/`
    : `boards/${boardId}/posts/${postId}/`;
  return {
    originalKey: `${prefix}original`,
    thumbnailKey: `${prefix}thumbnail`,
  };
}
