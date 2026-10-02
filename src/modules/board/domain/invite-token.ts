export type InviteToken = {
  id: string;
  boardId: string;
  token: string;
  revokedAt: Date | null;
  createdAt: Date;
};

/** 一般閲覧者向けの招待リンク（`/b/{token}`）の絶対 URL を作る。`baseUrl` の末尾の `/` は付いていてもいなくてもよい。 */
export function buildInviteUrl({
  baseUrl,
  token,
}: {
  baseUrl: string;
  token: string;
}): string {
  return `${baseUrl.replace(/\/+$/, "")}/b/${token}`;
}
