import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { user } from "@/modules/auth/infrastructure/schema";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { isExpired, isPublished } from "@/modules/post/domain/post";
import type { CreatePostData } from "@/modules/post/domain/post-repository";
import {
  NOW,
  PUBLISH_STATE_EXAMPLES,
} from "@/modules/post/testing/publish-state-examples";
import { DatabaseError } from "@/shared/infrastructure/database-error";
import { testDb } from "@/shared/testing/test-db";
import { makeDrizzlePostRepository } from "./drizzle-post-repository";
import { post } from "./schema";

const repository = makeDrizzlePostRepository(testDb);
const boardRepository = makeDrizzleBoardRepository(testDb);

async function createBoard() {
  return boardRepository.create({ name: "中野のボード", isPublic: true });
}

function postData(
  boardId: string,
  overrides: Partial<CreatePostData> = {},
): CreatePostData {
  const id = randomUUID();
  return {
    id,
    publicId: `public-${id}`,
    boardId,
    title: "夏祭りのお知らせ",
    description: null,
    externalUrl: null,
    originalKey: `boards/${boardId}/posts/${id}/original`,
    originalContentType: "application/pdf",
    originalSize: 1000,
    thumbnailKey: `boards/${boardId}/posts/${id}/thumbnail`,
    thumbnailSize: 100,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    status: "published",
    ...overrides,
  };
}

test("掲示物を登録すると、渡した ID と DB が振った日時を含めて返す", async () => {
  const board = await createBoard();
  const data = postData(board.id);

  const post = await repository.create(data);

  expect(post).toMatchObject({
    ...data,
    description: null,
    externalUrl: null,
    removedAt: null,
    removedBy: null,
  });
  expect(post.createdAt).toBeInstanceOf(Date);
});

test("掲示終了が null（無期限）の掲示物を登録できる", async () => {
  const board = await createBoard();

  const post = await repository.create(postData(board.id, { expiresAt: null }));

  expect(post.expiresAt).toBeNull();
});

test("掲示終了が掲示開始より後でない掲示物は登録できない", async () => {
  const board = await createBoard();
  const data = postData(board.id, {
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-01T00:00:00Z"),
  });

  await expect(repository.create(data)).rejects.toBeInstanceOf(DatabaseError);
});

test.each([
  ["原本", { originalSize: 0 }],
  ["サムネイル", { thumbnailSize: -1 }],
])("%sのサイズが正の数でない掲示物は登録できない", async (_, overrides) => {
  const board = await createBoard();

  await expect(
    repository.create(postData(board.id, overrides)),
  ).rejects.toBeInstanceOf(DatabaseError);
});

test("同じ publicId の掲示物は登録できない", async () => {
  const board = await createBoard();
  await repository.create(postData(board.id, { publicId: "same" }));

  await expect(
    repository.create(postData(board.id, { publicId: "same" })),
  ).rejects.toBeInstanceOf(DatabaseError);
});

test("掲示物の数は、撤去済みを除き、ほかの掲示板を含めずに数える", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(postData(board.id));
  await repository.create(postData(board.id, { status: "draft" }));
  await repository.create(postData(board.id, { status: "removed" }));
  await repository.create(postData(other.id));

  expect(await repository.countActiveByBoardId(board.id)).toBe(2);
});

test("ファイルのサイズは、原本とサムネイルを足し、撤去済みも含めて合計する", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(
    postData(board.id, { originalSize: 1000, thumbnailSize: 100 }),
  );
  await repository.create(
    postData(board.id, {
      originalSize: 20,
      thumbnailSize: 3,
      status: "removed",
    }),
  );
  await repository.create(postData(other.id, { originalSize: 5000 }));

  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(1123);
});

test("合計が 32 ビットの整数に収まらなくても、正しく合計する", async () => {
  const board = await createBoard();
  const size = 3 * 1024 * 1024 * 1024;
  await repository.create(postData(board.id, { originalSize: size }));
  await repository.create(postData(board.id, { originalSize: size }));

  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(size * 2 + 200);
});

test("掲示物のない掲示板では、数も合計も 0 になる", async () => {
  const board = await createBoard();

  expect(await repository.countActiveByBoardId(board.id)).toBe(0);
  expect(await repository.sumFileSizeByBoardId(board.id)).toBe(0);
});

test("公開中の掲示物だけを返す。無期限の掲示物も含め、domain の isPublished と同じ判定になる", async () => {
  const board = await createBoard();
  for (const {
    name,
    status,
    publishFrom,
    expiresAt,
  } of PUBLISH_STATE_EXAMPLES) {
    await repository.create(
      postData(board.id, { title: name, status, publishFrom, expiresAt }),
    );
  }

  const found = await repository.findPublished({
    boardId: board.id,
    now: NOW,
    limit: 100,
  });

  const expected = PUBLISH_STATE_EXAMPLES.filter(
    (example) => example.published,
  ).map((example) => example.name);
  expect(found.map((post) => post.title).sort()).toEqual(expected.sort());
  expect(expected).toContain("無期限で、掲示開始を過ぎている");
  expect(found.every((post) => isPublished(post, NOW))).toBe(true);
});

test("ほかの掲示板の掲示物は返さない", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(postData(other.id));

  const found = await repository.findPublished({
    boardId: board.id,
    now: new Date("2026-10-15T00:00:00Z"),
    limit: 100,
  });

  expect(found).toEqual([]);
});

test("掲示開始の新しい順、同じ日時なら ID の大きい順に返し、続きを重複も抜けもなく取れる", async () => {
  const board = await createBoard();
  const sameTime = new Date("2026-10-05T00:00:00Z");
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ];
  for (const id of ids) {
    await repository.create(
      postData(board.id, { id, publicId: id, publishFrom: sameTime }),
    );
  }
  const newest = await repository.create(
    postData(board.id, { publishFrom: new Date("2026-10-10T00:00:00Z") }),
  );
  const oldest = await repository.create(
    postData(board.id, { publishFrom: new Date("2026-10-01T00:00:00Z") }),
  );
  const now = new Date("2026-10-15T00:00:00Z");

  const first = await repository.findPublished({
    boardId: board.id,
    now,
    limit: 2,
  });
  const last = first[first.length - 1];
  const second = await repository.findPublished({
    boardId: board.id,
    now,
    limit: 2,
    after: { publishFrom: last.publishFrom, id: last.id },
  });
  const secondLast = second[second.length - 1];
  const third = await repository.findPublished({
    boardId: board.id,
    now,
    limit: 2,
    after: { publishFrom: secondLast.publishFrom, id: secondLast.id },
  });

  expect([...first, ...second, ...third].map((post) => post.id)).toEqual([
    newest.id,
    ids[2],
    ids[1],
    ids[0],
    oldest.id,
  ]);
});

test("公開の ID から掲示物を探せる。ない ID と、形の合わない ID は null を返す", async () => {
  const board = await createBoard();
  const created = await repository.create(
    postData(board.id, { publicId: "public-abc_DEF-123" }),
  );

  expect(await repository.findByPublicId("public-abc_DEF-123")).toEqual(
    created,
  );
  expect(await repository.findByPublicId("unknown")).toBeNull();
  expect(await repository.findByPublicId("a\u0000b")).toBeNull();
  expect(await repository.findByPublicId("")).toBeNull();
});

test("期限切れの掲示物だけを返す。条件は domain の isExpired と同じで、無期限の掲示物は含めない", async () => {
  const board = await createBoard();
  for (const {
    name,
    status,
    publishFrom,
    expiresAt,
  } of PUBLISH_STATE_EXAMPLES) {
    await repository.create(
      postData(board.id, { title: name, status, publishFrom, expiresAt }),
    );
  }

  const found = await repository.findExpired({
    boardId: board.id,
    now: NOW,
    limit: 100,
  });

  const expected = PUBLISH_STATE_EXAMPLES.filter(
    (example) => example.expired,
  ).map((example) => example.name);
  expect(expected.length).toBeGreaterThan(0);
  expect(found.map((post) => post.title).sort()).toEqual(expected.sort());
  expect(found.every((post) => isExpired(post, NOW))).toBe(true);
});

test("ほかの掲示板の期限切れの掲示物は返さない", async () => {
  const board = await createBoard();
  const other = await createBoard();
  await repository.create(postData(other.id));

  const found = await repository.findExpired({
    boardId: board.id,
    now: new Date("2026-12-01T00:00:00Z"),
    limit: 100,
  });

  expect(found).toEqual([]);
});

test("期限切れの掲示物を、掲示終了の古い順、同じ日時なら ID の小さい順に返し、続きを重複も抜けもなく取れる", async () => {
  const board = await createBoard();
  const sameTime = new Date("2026-10-05T00:00:00Z");
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ];
  for (const id of [...ids].reverse()) {
    await repository.create(
      postData(board.id, { id, publicId: id, expiresAt: sameTime }),
    );
  }
  const newest = await repository.create(
    postData(board.id, { expiresAt: new Date("2026-10-10T00:00:00Z") }),
  );
  const oldest = await repository.create(
    postData(board.id, { expiresAt: new Date("2026-10-02T00:00:00Z") }),
  );
  const now = new Date("2026-10-15T00:00:00Z");

  const first = await repository.findExpired({
    boardId: board.id,
    now,
    limit: 2,
  });
  const last = first[first.length - 1];
  const second = await repository.findExpired({
    boardId: board.id,
    now,
    limit: 2,
    after: { expiresAt: last.expiresAt, id: last.id },
  });
  const secondLast = second[second.length - 1];
  const third = await repository.findExpired({
    boardId: board.id,
    now,
    limit: 2,
    after: { expiresAt: secondLast.expiresAt, id: secondLast.id },
  });

  expect([...first, ...second, ...third].map((post) => post.id)).toEqual([
    oldest.id,
    ids[0],
    ids[1],
    ids[2],
    newest.id,
  ]);
});

async function createUser(id: string) {
  await testDb.insert(user).values({
    id,
    name: "テストユーザー",
    email: `${id}@example.com`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

test("撤去済みにすると、状態・日時・撤去した人が記録され、期限切れの一覧から消える", async () => {
  const board = await createBoard();
  const userId = await createUser("user-1");
  const created = await repository.create(postData(board.id));
  const removedAt = new Date("2026-12-01T00:00:00Z");

  const removed = await repository.markRemoved({
    id: created.id,
    removedAt,
    removedBy: userId,
  });

  expect(removed).toBe(true);
  expect(await repository.findByPublicId(created.publicId)).toMatchObject({
    status: "removed",
    removedAt,
    removedBy: userId,
  });
  expect(
    await repository.findExpired({
      boardId: board.id,
      now: removedAt,
      limit: 10,
    }),
  ).toEqual([]);
});

test("すでに撤去済みの掲示物と下書きは書き換えず、false を返す", async () => {
  const board = await createBoard();
  const first = await createUser("user-1");
  const second = await createUser("user-2");
  const created = await repository.create(postData(board.id));
  const draft = await repository.create(
    postData(board.id, { status: "draft" }),
  );
  const removedAt = new Date("2026-12-01T00:00:00Z");
  await repository.markRemoved({ id: created.id, removedAt, removedBy: first });

  const again = await repository.markRemoved({
    id: created.id,
    removedAt: new Date("2026-12-02T00:00:00Z"),
    removedBy: second,
  });
  const draftRemoved = await repository.markRemoved({
    id: draft.id,
    removedAt,
    removedBy: first,
  });

  expect(again).toBe(false);
  expect(draftRemoved).toBe(false);
  expect(await repository.findByPublicId(created.publicId)).toMatchObject({
    removedAt,
    removedBy: first,
  });
  const [stillDraft] = await testDb
    .select()
    .from(post)
    .where(eq(post.id, draft.id));
  expect(stillDraft.status).toBe("draft");
});

test("同時に撤去済みにしても、書き換えるのは 1 回だけ", async () => {
  const board = await createBoard();
  const userId = await createUser("user-1");
  const created = await repository.create(postData(board.id));

  const results = await Promise.all(
    [1, 2, 3].map((day) =>
      repository.markRemoved({
        id: created.id,
        removedAt: new Date(`2026-12-0${day}T00:00:00Z`),
        removedBy: userId,
      }),
    ),
  );

  expect(results.filter(Boolean)).toHaveLength(1);
});
