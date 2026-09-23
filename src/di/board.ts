import { makeCheckBoardAccess } from "@/modules/board/application/check-board-access";
import { makeCreateBoard } from "@/modules/board/application/create-board";
import { makeFindLandingBoard } from "@/modules/board/application/find-landing-board";
import { makeGetBoard } from "@/modules/board/application/get-board";
import { makeListMyBoards } from "@/modules/board/application/list-my-boards";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { generateInviteToken } from "@/modules/board/infrastructure/generate-invite-token";
import { db } from "@/shared/infrastructure/db";
import { makeDrizzleUnitOfWork } from "@/shared/infrastructure/drizzle-unit-of-work";

const boardRepository = makeDrizzleBoardRepository(db);

const unitOfWork = makeDrizzleUnitOfWork(db, (executor) => ({
  boardRepository: makeDrizzleBoardRepository(executor),
}));

const checkBoardAccess = makeCheckBoardAccess({ boardRepository });

export const createBoard = makeCreateBoard({ unitOfWork, generateInviteToken });

export const listMyBoards = makeListMyBoards({ boardRepository });

export const findLandingBoard = makeFindLandingBoard({ boardRepository });

export const getBoard = makeGetBoard({ boardRepository, checkBoardAccess });
