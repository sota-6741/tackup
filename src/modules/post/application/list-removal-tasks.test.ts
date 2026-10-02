import { expect, test } from "vitest";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { POST_PAGE_SIZE } from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import { makeInMemoryPostRepository } from "@/modules/post/testing/in-memory-post-repository";
import { makeInMemoryFileStorage } from "@/shared/testing/in-memory-file-storage";
import { makeListRemovalTasks } from "./list-removal-tasks";

const NOW = new Date("2026-10-15T00:00:00Z");
const STORAGE = "https://storage.example.com";

async function setup() {
  const { repository: boardRepository, members } =
    makeInMemoryBoardRepository();
  const { repository: postRepository } = makeInMemoryPostRepository();
  const { fileStorage } = makeInMemoryFileStorage();
  const board = await boardRepository.create({
    name: "中野のボード",
    isPublic: true,
  });
  members.push({
    boardId: board.id,
    userId: "member",
    role: "poster",
    createdAt: new Date(),
  });
  let count = 0;
  const createPost = (overrides: Partial<CreatePostData> = {}) => {
    count += 1;
    const id = `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
    return postRepository.create({
      id,
      publicId: `public-${count}`,
      boardId: board.id,
      title: `掲示物 ${count}`,
      description: null,
      externalUrl: null,
      originalKey: `posts/${id}/original`,
      originalContentType: "application/pdf",
      originalSize: 1000,
      thumbnailKey: `posts/${id}/thumbnail`,
      thumbnailSize: 100,
      thumbnailWidth: 565,
      thumbnailHeight: 800,
      publishFrom: new Date("2026-09-01T00:00:00Z"),
      expiresAt: new Date("2026-10-01T00:00:00Z"),
      status: "published",
      ...overrides,
    });
  };
  const listRemovalTasks = makeListRemovalTasks({
    checkBoardAccess: makeCheckBoardAccess({ boardRepository }),
    postRepository,
    fileStorage,
    now: () => NOW,
  });
  return { listRemovalTasks, createPost, board };
}

test("期限切れの掲示物を、掲示終了の古い順に返す。内部の ID とキーは含めない", async () => {
  const { listRemovalTasks, createPost, board } = await setup();
  await createPost({ expiresAt: new Date("2026-10-10T00:00:00Z") });
  const older = await createPost({
    expiresAt: new Date("2026-10-05T00:00:00Z"),
  });
  await createPost({ expiresAt: new Date("2026-11-01T00:00:00Z") });
  await createPost({ expiresAt: null });
  await createPost({ status: "removed" });

  const result = await listRemovalTasks({
    boardId: board.id,
    userId: "member",
  });

  expect(result).toEqual({
    ok: true,
    tasks: [
      {
        publicId: "public-2",
        title: "掲示物 2",
        thumbnailUrl: `${STORAGE}/${older.thumbnailKey}`,
        thumbnailWidth: 565,
        thumbnailHeight: 800,
        expiresAt: new Date("2026-10-05T00:00:00Z"),
      },
      expect.objectContaining({ publicId: "public-1" }),
    ],
    nextCursor: null,
    isContinuation: false,
    now: NOW,
  });
});

test("1 ページを超えるときは、続きの位置を返し、続きを重複も抜けもなく取れる", async () => {
  const { listRemovalTasks, createPost, board } = await setup();
  for (let index = 0; index < POST_PAGE_SIZE + 2; index += 1) {
    await createPost();
  }
  const input = { boardId: board.id, userId: "member" };

  const first = await listRemovalTasks(input);
  if (!first.ok || !first.nextCursor) throw new Error("続きがない");
  const second = await listRemovalTasks({ ...input, cursor: first.nextCursor });
  if (!second.ok) throw new Error("続きを取れない");

  expect(first.tasks).toHaveLength(POST_PAGE_SIZE);
  expect(second.tasks).toHaveLength(2);
  expect(second.nextCursor).toBeNull();
  expect(second.isContinuation).toBe(true);
  const publicIds = [...first.tasks, ...second.tasks].map(
    (task) => task.publicId,
  );
  expect(new Set(publicIds).size).toBe(POST_PAGE_SIZE + 2);
});

test("続きの位置の形が合わなければ、最初のページを返す", async () => {
  const { listRemovalTasks, createPost, board } = await setup();
  await createPost();

  const result = await listRemovalTasks({
    boardId: board.id,
    userId: "member",
    cursor: "invalid",
  });

  expect(result).toMatchObject({
    ok: true,
    tasks: [{ publicId: "public-1" }],
    isContinuation: false,
  });
});

test("メンバーでない人には、掲示板がないときと同じ結果を返す", async () => {
  const { listRemovalTasks, createPost, board } = await setup();
  await createPost();

  expect(
    await listRemovalTasks({ boardId: board.id, userId: "stranger" }),
  ).toEqual({ ok: false, reason: "board_not_found" });
});
