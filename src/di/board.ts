import "server-only";
import { rateLimiter } from "@/di/rate-limiter";
import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeCreateBoard } from "@/modules/board/application/create-board";
import { makeFindLandingBoard } from "@/modules/board/application/find-landing-board";
import { makeGetBoard } from "@/modules/board/application/get-board";
import { makeListMyBoards } from "@/modules/board/application/list-my-boards";
import { makeReissueInviteToken } from "@/modules/board/application/reissue-invite-token";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { generateInviteToken } from "@/modules/board/infrastructure/generate-invite-token";
import { WRITE_RATE_LIMIT, withRateLimit } from "@/shared/domain/rate-limiter";
import { appBaseUrl } from "@/shared/infrastructure/app-url";
import { db } from "@/shared/infrastructure/db";
import { makeDrizzleUnitOfWork } from "@/shared/infrastructure/drizzle-unit-of-work";

const boardRepository = makeDrizzleBoardRepository(db);

const unitOfWork = makeDrizzleUnitOfWork(db, (executor) => ({
  boardRepository: makeDrizzleBoardRepository(executor),
}));

export const checkBoardAccess = makeCheckBoardAccess({ boardRepository });

const writeLimit = { rateLimiter, rule: WRITE_RATE_LIMIT };

export const createBoard = withRateLimit(
  makeCreateBoard({ unitOfWork, generateInviteToken }),
  writeLimit,
);

export const listMyBoards = makeListMyBoards({ boardRepository });

export const findLandingBoard = makeFindLandingBoard({ boardRepository });

export const getBoard = makeGetBoard({
  boardRepository,
  checkBoardAccess,
  appBaseUrl,
});

export const reissueInviteToken = withRateLimit(
  makeReissueInviteToken({
    unitOfWork,
    checkBoardAccess,
    generateInviteToken,
    appBaseUrl,
  }),
  writeLimit,
);
