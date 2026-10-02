import { expect, test, vi } from "vitest";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeListPublicBoardPosts } from "./list-public-board-posts";
import type { PublishedPostsPage } from "./list-published-posts";

const page: PublishedPostsPage = {
  posts: [
    {
      publicId: "public-1",
      title: "夏祭りのお知らせ",
      thumbnailUrl: "https://storage.example.com/thumbnail",
      thumbnailWidth: 565,
      thumbnailHeight: 800,
    },
  ],
  nextCursor: "next",
  isContinuation: false,
};

async function setup({ isPublic }: { isPublic: boolean }) {
  const { repository } = makeInMemoryBoardRepository();
  const board = await repository.create({ name: "中野のボード", isPublic });
  await repository.addInviteToken({ boardId: board.id, token: "token-1" });
  const listPublishedPosts = vi.fn(async () => page);
  const listPublicBoardPosts = makeListPublicBoardPosts({
    boardRepository: repository,
    listPublishedPosts,
  });
  return { listPublicBoardPosts, listPublishedPosts, repository, board };
}

test("公開掲示板の有効な招待リンクなら、掲示板名と公開中の掲示物の一覧を返す", async () => {
  const { listPublicBoardPosts, listPublishedPosts, board } = await setup({
    isPublic: true,
  });

  const result = await listPublicBoardPosts({
    inviteToken: "token-1",
    cursor: "cursor",
  });

  expect(result).toEqual({ ok: true, boardName: "中野のボード", ...page });
  expect(listPublishedPosts).toHaveBeenCalledWith({
    boardId: board.id,
    cursor: "cursor",
  });
});

test("非公開の掲示板の招待リンクは board_not_found になり、掲示物を取りに行かない", async () => {
  const { listPublicBoardPosts, listPublishedPosts } = await setup({
    isPublic: false,
  });

  const result = await listPublicBoardPosts({ inviteToken: "token-1" });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(listPublishedPosts).not.toHaveBeenCalled();
});

test("存在しない招待リンクは board_not_found になる", async () => {
  const { listPublicBoardPosts, listPublishedPosts } = await setup({
    isPublic: true,
  });

  const result = await listPublicBoardPosts({ inviteToken: "token-unknown" });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(listPublishedPosts).not.toHaveBeenCalled();
});

test("再発行で失効した招待リンクは board_not_found になり、新しいリンクは通る", async () => {
  const { listPublicBoardPosts, repository, board } = await setup({
    isPublic: true,
  });
  await repository.revokeActiveInviteToken(board.id);
  await repository.addInviteToken({ boardId: board.id, token: "token-2" });

  expect(await listPublicBoardPosts({ inviteToken: "token-1" })).toEqual({
    ok: false,
    reason: "board_not_found",
  });
  expect((await listPublicBoardPosts({ inviteToken: "token-2" })).ok).toBe(
    true,
  );
});
