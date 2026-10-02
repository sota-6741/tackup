import { expect, test, vi } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeListBoardPosts } from "./list-board-posts";
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

async function setup({ role }: { role: Role }) {
  const { repository, members } = makeInMemoryBoardRepository();
  const board = await repository.create({
    name: "中野のボード",
    isPublic: false,
  });
  members.push({
    boardId: board.id,
    userId: "user-1",
    role,
    createdAt: new Date(),
  });
  const listPublishedPosts = vi.fn(async () => page);
  const listBoardPosts = makeListBoardPosts({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    listPublishedPosts,
  });
  return { listBoardPosts, listPublishedPosts, board };
}

test.each<Role>(["admin", "poster"])(
  "%s には、非公開の掲示板でも公開中の掲示物の一覧を返す",
  async (role) => {
    const { listBoardPosts, listPublishedPosts, board } = await setup({ role });

    const result = await listBoardPosts({
      boardId: board.id,
      userId: "user-1",
      cursor: "cursor",
    });

    expect(result).toEqual({ ok: true, ...page });
    expect(listPublishedPosts).toHaveBeenCalledWith({
      boardId: board.id,
      cursor: "cursor",
    });
  },
);

test("所属していないユーザーは board_not_found になり、掲示物を取りに行かない", async () => {
  const { listBoardPosts, listPublishedPosts, board } = await setup({
    role: "admin",
  });

  const result = await listBoardPosts({ boardId: board.id, userId: "user-2" });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(listPublishedPosts).not.toHaveBeenCalled();
});
