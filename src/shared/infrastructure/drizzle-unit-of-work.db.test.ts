import { expect, test } from "vitest";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { board } from "@/modules/board/infrastructure/schema";
import { testDb } from "@/shared/testing/test-db";
import { makeDrizzleUnitOfWork } from "./drizzle-unit-of-work";

const unitOfWork = makeDrizzleUnitOfWork(testDb, (executor) => ({
  boardRepository: makeDrizzleBoardRepository(executor),
}));

test("処理が成功すると保存が確定し、処理の戻り値を返す", async () => {
  const created = await unitOfWork.run(({ boardRepository }) =>
    boardRepository.create({ name: "A", isPublic: false }),
  );

  expect(await testDb.select().from(board)).toEqual([created]);
});

test("途中で DB エラーが起きると、それまでの保存も取り消される", async () => {
  await expect(
    unitOfWork.run(async ({ boardRepository }) => {
      const created = await boardRepository.create({
        name: "A",
        isPublic: false,
      });
      await boardRepository.addMember({
        boardId: created.id,
        userId: "no-such-user",
        role: "admin",
      });
    }),
  ).rejects.toThrow();

  expect(await testDb.select().from(board)).toEqual([]);
});

test("途中で例外を投げると、それまでの保存も取り消される", async () => {
  await expect(
    unitOfWork.run(async ({ boardRepository }) => {
      await boardRepository.create({ name: "A", isPublic: false });
      throw new Error("途中で失敗");
    }),
  ).rejects.toThrow("途中で失敗");

  expect(await testDb.select().from(board)).toEqual([]);
});
