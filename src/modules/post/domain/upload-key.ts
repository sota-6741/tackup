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

/** 確認を通ったファイルを置く、正式な場所のキー。 */
export function postFileKeys({
  boardId,
  postId,
}: {
  boardId: string;
  postId: string;
}): { originalKey: string; thumbnailKey: string } {
  const prefix = `boards/${boardId}/posts/${postId}/`;
  return {
    originalKey: `${prefix}original`,
    thumbnailKey: `${prefix}thumbnail`,
  };
}
