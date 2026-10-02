import "server-only";
import { randomUUID } from "node:crypto";
import { checkBoardAccess } from "@/di/board";
import { rateLimiter } from "@/di/rate-limiter";
import { makeDrizzleBoardRepository } from "@/modules/board/infrastructure/drizzle-board-repository";
import { makeCreateUploadUrls } from "@/modules/post/application/create-upload-urls";
import { makeFindAccessiblePost } from "@/modules/post/application/find-accessible-post";
import { makeGetPostDetail } from "@/modules/post/application/get-post-detail";
import { makeGetPostFileUrl } from "@/modules/post/application/get-post-file-url";
import { makeListBoardPosts } from "@/modules/post/application/list-board-posts";
import { makeListPublicBoardPosts } from "@/modules/post/application/list-public-board-posts";
import { makeListPublishedPosts } from "@/modules/post/application/list-published-posts";
import { makeRecordPostView } from "@/modules/post/application/record-post-view";
import { makeRegisterPost } from "@/modules/post/application/register-post";
import { makeDrizzlePostRepository } from "@/modules/post/infrastructure/drizzle-post-repository";
import { makeDrizzleViewLogRepository } from "@/modules/post/infrastructure/drizzle-view-log-repository";
import { generatePublicId } from "@/modules/post/infrastructure/generate-public-id";
import { generateUploadKey } from "@/modules/post/infrastructure/generate-upload-key";
import {
  UPLOAD_URL_RATE_LIMIT,
  WRITE_RATE_LIMIT,
  withRateLimit,
} from "@/shared/domain/rate-limiter";
import { db } from "@/shared/infrastructure/db";
import { makeDrizzleUnitOfWork } from "@/shared/infrastructure/drizzle-unit-of-work";
import { fileStorage } from "@/shared/infrastructure/storage";

const postRepository = makeDrizzlePostRepository(db);

const unitOfWork = makeDrizzleUnitOfWork(db, (executor) => ({
  boardRepository: makeDrizzleBoardRepository(executor),
  postRepository: makeDrizzlePostRepository(executor),
}));

export const createUploadUrls = withRateLimit(
  makeCreateUploadUrls({
    checkBoardAccess,
    fileStorage,
    postRepository,
    generateUploadKey,
  }),
  { rateLimiter, rule: UPLOAD_URL_RATE_LIMIT },
);

export const registerPost = withRateLimit(
  makeRegisterPost({
    checkBoardAccess,
    fileStorage,
    unitOfWork,
    generatePostId: randomUUID,
    generatePublicId,
  }),
  { rateLimiter, rule: WRITE_RATE_LIMIT },
);

/** 掲示板を見てよいかを確かめないので、ここからは出さない。確かめる use case に渡して使う。 */
const listPublishedPosts = makeListPublishedPosts({
  postRepository,
  fileStorage,
  now: () => new Date(),
});

export const listBoardPosts = makeListBoardPosts({
  checkBoardAccess,
  listPublishedPosts,
});

export const listPublicBoardPosts = makeListPublicBoardPosts({
  boardRepository: makeDrizzleBoardRepository(db),
  listPublishedPosts,
});

/** 見てよいかの確認そのもの。確認した結果を使う use case に渡して使う。 */
const findAccessiblePost = makeFindAccessiblePost({
  postRepository,
  boardRepository: makeDrizzleBoardRepository(db),
  now: () => new Date(),
});

export const getPostDetail = makeGetPostDetail({
  findAccessiblePost,
  fileStorage,
});

export const getPostFileUrl = makeGetPostFileUrl({
  findAccessiblePost,
  fileStorage,
});

export const recordPostView = makeRecordPostView({
  viewLogRepository: makeDrizzleViewLogRepository(db),
});
