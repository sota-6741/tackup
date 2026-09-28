import { expect, test } from "vitest";
import type { Role } from "@/modules/board/domain/board-member";
import { makeInMemoryBoardRepository } from "@/modules/board/testing/in-memory-board-repository";
import { makeInMemoryUnitOfWork } from "@/shared/testing/in-memory-unit-of-work";
import { makeCheckBoardAccess } from "./check-board-access";
import { makeReissueInviteToken } from "./reissue-invite-token";

async function setup({ role }: { role: Role }) {
  const { repository, members, inviteTokens } = makeInMemoryBoardRepository();
  const reissueInviteToken = makeReissueInviteToken({
    unitOfWork: makeInMemoryUnitOfWork({ boardRepository: repository }),
    checkBoardAccess: makeCheckBoardAccess({ boardRepository: repository }),
    generateInviteToken: () => "token-new",
    appBaseUrl: "https://tackup.example.com",
  });
  const board = await repository.create({
    name: "中野のボード",
    isPublic: true,
  });
  members.push({
    boardId: board.id,
    userId: "user-1",
    role,
    createdAt: new Date(),
  });
  await repository.addInviteToken({ boardId: board.id, token: "token-old" });
  return { reissueInviteToken, repository, inviteTokens, board };
}

test("admin は招待リンクを再発行でき、新しいリンクの URL を返す", async () => {
  const { reissueInviteToken, repository, board } = await setup({
    role: "admin",
  });

  const result = await reissueInviteToken({
    boardId: board.id,
    userId: "user-1",
  });

  expect(result).toEqual({
    ok: true,
    inviteUrl: "https://tackup.example.com/b/token-new",
  });
  expect(await repository.findActiveInviteToken(board.id)).toMatchObject({
    token: "token-new",
  });
});

test("再発行すると、以前の招待リンクは失効する", async () => {
  const { reissueInviteToken, inviteTokens, board } = await setup({
    role: "admin",
  });

  await reissueInviteToken({ boardId: board.id, userId: "user-1" });

  const old = inviteTokens.find(
    (inviteToken) => inviteToken.token === "token-old",
  );
  expect(old?.revokedAt).toBeInstanceOf(Date);
  expect(
    inviteTokens.filter((inviteToken) => inviteToken.revokedAt === null),
  ).toHaveLength(1);
});

test("poster は forbidden になり、招待リンクは変わらない", async () => {
  const { reissueInviteToken, inviteTokens, board } = await setup({
    role: "poster",
  });

  const result = await reissueInviteToken({
    boardId: board.id,
    userId: "user-1",
  });

  expect(result).toEqual({ ok: false, reason: "forbidden" });
  expect(inviteTokens).toHaveLength(1);
  expect(inviteTokens[0]).toMatchObject({
    token: "token-old",
    revokedAt: null,
  });
});

test("所属していないユーザーは board_not_found になる", async () => {
  const { reissueInviteToken, inviteTokens, board } = await setup({
    role: "admin",
  });

  const result = await reissueInviteToken({
    boardId: board.id,
    userId: "user-2",
  });

  expect(result).toEqual({ ok: false, reason: "board_not_found" });
  expect(inviteTokens).toHaveLength(1);
});
