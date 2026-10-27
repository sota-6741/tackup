"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createReplacementUploadUrls,
  createUploadUrls,
  registerPost,
  removePost,
  replaceOriginal,
  updatePost,
} from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import type { CreateReplacementUploadUrlsResult } from "@/modules/post/application/create-replacement-upload-urls";
import type {
  CreateUploadUrlsResult,
  UploadTarget,
} from "@/modules/post/application/create-upload-urls";
import type { RegisterPostResult } from "@/modules/post/application/register-post";
import type { RemovePostResult } from "@/modules/post/application/remove-post";
import type { ReplaceOriginalResult } from "@/modules/post/application/replace-original";
import type { UpdatePostResult } from "@/modules/post/application/update-post";
import { ORIGINAL_FILE_MAX_SIZE } from "@/modules/post/domain/original-file";
import type { RateLimited } from "@/shared/domain/rate-limiter";
import type {
  ActionFailureReason,
  ActionResult,
} from "@/shared/presentation/lib/action-result";
import { RATE_LIMITED_MESSAGE } from "@/shared/presentation/lib/messages";
import { POST_INPUT_ERROR_MESSAGES } from "./post-messages";

const MAX_SIZE_MB = ORIGINAL_FILE_MAX_SIZE / 1024 / 1024;
const UNEXPECTED_INPUT =
  "登録できませんでした。画面を読み込み直して、もう一度お試しください。";
const FORBIDDEN = "この掲示板に掲示物を登録できません。";
const POST_LIMIT_EXCEEDED =
  "この掲示板に登録できる掲示物の数の上限に達しています。";
const STORAGE_LIMIT_EXCEEDED =
  "この掲示板で保存できるファイルの容量の上限に達しています。";
const POST_NOT_FOUND =
  "掲示物が見つかりません。画面を読み込み直して、もう一度お試しください。";
const FILE_INVALID =
  "ファイルを確認できませんでした。ファイルを選び直して、もう一度お試しください。";
/** 選んだファイルが決まりに合わないとき。登録と差し替えで同じ文言にする。 */
const ORIGINAL_FILE_ERROR_MESSAGES = {
  content_type_not_allowed: "PDF・JPEG・PNG・WebP のファイルを選んでください。",
  size_invalid: "空のファイルは選べません。",
  file_too_large: `${MAX_SIZE_MB}MB 以下のファイルを選んでください。`,
};

const declaredFile = z.object({ contentType: z.string(), size: z.number() });

const createUploadUrlsInput = z.object({
  boardId: z.string(),
  original: declaredFile,
  thumbnail: declaredFile,
});

export type CreateUploadUrlsActionResult =
  | { ok: true; original: UploadTarget; thumbnail: UploadTarget }
  | { ok: false; error: string };

const CREATE_UPLOAD_URLS_ERROR_MESSAGES: Record<
  Extract<CreateUploadUrlsResult | RateLimited, { ok: false }>["reason"],
  string
> = {
  rate_limited: RATE_LIMITED_MESSAGE,
  board_not_found: FORBIDDEN,
  forbidden: FORBIDDEN,
  ...ORIGINAL_FILE_ERROR_MESSAGES,
  thumbnail_invalid: UNEXPECTED_INPUT,
  post_limit_exceeded: POST_LIMIT_EXCEEDED,
  storage_limit_exceeded: STORAGE_LIMIT_EXCEEDED,
};

export async function createUploadUrlsAction(
  input: unknown,
): Promise<CreateUploadUrlsActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = createUploadUrlsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: UNEXPECTED_INPUT };

  const result = await createUploadUrls({
    boardId: parsed.data.boardId,
    userId: session.user.id,
    original: parsed.data.original,
    thumbnail: parsed.data.thumbnail,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: CREATE_UPLOAD_URLS_ERROR_MESSAGES[result.reason],
    };
  }
  return { ok: true, original: result.original, thumbnail: result.thumbnail };
}

const registerPostInput = z.object({
  boardId: z.string(),
  title: z.string(),
  description: z.string(),
  externalUrl: z.string(),
  publishFrom: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  originalKey: z.string(),
  thumbnailKey: z.string(),
  thumbnailWidth: z.number(),
  thumbnailHeight: z.number(),
});

export type RegisterPostActionResult =
  | { ok: true }
  | { ok: false; error: string };

const REGISTER_POST_ERROR_MESSAGES: Record<
  Extract<RegisterPostResult | RateLimited, { ok: false }>["reason"],
  string
> = {
  rate_limited: RATE_LIMITED_MESSAGE,
  board_not_found: FORBIDDEN,
  forbidden: FORBIDDEN,
  ...POST_INPUT_ERROR_MESSAGES,
  file_invalid: FILE_INVALID,
  post_limit_exceeded: POST_LIMIT_EXCEEDED,
  storage_limit_exceeded: STORAGE_LIMIT_EXCEEDED,
};

export async function registerPostAction(
  input: unknown,
): Promise<RegisterPostActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = registerPostInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: UNEXPECTED_INPUT };
  const { boardId, expiresAt } = parsed.data;

  const result = await registerPost({
    boardId,
    userId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    externalUrl: parsed.data.externalUrl,
    publishFrom: new Date(parsed.data.publishFrom),
    expiresAt: expiresAt === null ? null : new Date(expiresAt),
    originalKey: parsed.data.originalKey,
    thumbnailKey: parsed.data.thumbnailKey,
    thumbnailWidth: parsed.data.thumbnailWidth,
    thumbnailHeight: parsed.data.thumbnailHeight,
  });
  if (!result.ok) {
    return { ok: false, error: REGISTER_POST_ERROR_MESSAGES[result.reason] };
  }

  revalidatePath(`/boards/${boardId}`);
  return { ok: true };
}

export type RemovePostActionResult =
  | { ok: true }
  | { ok: false; error: string };

const REMOVE_POST_ERROR_MESSAGES: Record<
  Extract<RemovePostResult | RateLimited, { ok: false }>["reason"],
  string
> = {
  rate_limited: RATE_LIMITED_MESSAGE,
  post_not_found: POST_NOT_FOUND,
  post_not_removable: "この掲示物は撤去済みにできません。",
};

export async function removePostAction(
  publicId: unknown,
): Promise<RemovePostActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (typeof publicId !== "string") {
    return { ok: false, error: REMOVE_POST_ERROR_MESSAGES.post_not_found };
  }

  const result = await removePost({ publicId, userId: session.user.id });
  if (!result.ok) {
    return { ok: false, error: REMOVE_POST_ERROR_MESSAGES[result.reason] };
  }

  revalidatePostPages({ boardId: result.boardId, publicId });
  return { ok: true };
}

/** 掲示物を変えたときに、その掲示物が出る画面をすべて読み込み直させる。 */
function revalidatePostPages({
  boardId,
  publicId,
}: {
  boardId: string;
  publicId: string;
}) {
  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/boards/${boardId}/removals`);
  revalidatePath(`/boards/${boardId}/posts`);
  revalidatePath(`/posts/${publicId}`);
}

const updatePostInput = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string(),
  externalUrl: z.string(),
  publishFrom: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
});

const UPDATE_POST_ERROR_MESSAGES: Record<
  ActionFailureReason<UpdatePostResult>,
  string
> = {
  invalid_input:
    "保存できませんでした。画面を読み込み直して、もう一度お試しください。",
  rate_limited: RATE_LIMITED_MESSAGE,
  post_not_found: POST_NOT_FOUND,
  post_not_editable: "撤去済みの掲示物は編集できません。",
  ...POST_INPUT_ERROR_MESSAGES,
};

export async function updatePostAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = updatePostInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: UPDATE_POST_ERROR_MESSAGES.invalid_input };
  }
  const { publicId, expiresAt } = parsed.data;

  const result = await updatePost({
    publicId,
    userId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    externalUrl: parsed.data.externalUrl,
    publishFrom: new Date(parsed.data.publishFrom),
    expiresAt: expiresAt === null ? null : new Date(expiresAt),
  });
  if (!result.ok) {
    return { ok: false, error: UPDATE_POST_ERROR_MESSAGES[result.reason] };
  }

  revalidatePostPages({ boardId: result.boardId, publicId });
  return { ok: true };
}

const REPLACE_FAILED =
  "差し替えられませんでした。画面を読み込み直して、もう一度お試しください。";
const POST_NOT_EDITABLE = "撤去済みの掲示物は差し替えられません。";

const createReplacementUploadUrlsInput = z.object({
  publicId: z.string(),
  original: declaredFile,
  thumbnail: declaredFile,
});

const CREATE_REPLACEMENT_UPLOAD_URLS_ERROR_MESSAGES: Record<
  ActionFailureReason<CreateReplacementUploadUrlsResult>,
  string
> = {
  invalid_input: REPLACE_FAILED,
  rate_limited: RATE_LIMITED_MESSAGE,
  post_not_found: POST_NOT_FOUND,
  post_not_editable: POST_NOT_EDITABLE,
  ...ORIGINAL_FILE_ERROR_MESSAGES,
  thumbnail_invalid: REPLACE_FAILED,
  storage_limit_exceeded: STORAGE_LIMIT_EXCEEDED,
};

export async function createReplacementUploadUrlsAction(
  input: unknown,
): Promise<ActionResult<{ original: UploadTarget; thumbnail: UploadTarget }>> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = createReplacementUploadUrlsInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: CREATE_REPLACEMENT_UPLOAD_URLS_ERROR_MESSAGES.invalid_input,
    };
  }

  const result = await createReplacementUploadUrls({
    publicId: parsed.data.publicId,
    userId: session.user.id,
    original: parsed.data.original,
    thumbnail: parsed.data.thumbnail,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: CREATE_REPLACEMENT_UPLOAD_URLS_ERROR_MESSAGES[result.reason],
    };
  }
  return { ok: true, original: result.original, thumbnail: result.thumbnail };
}

const replaceOriginalInput = z.object({
  publicId: z.string(),
  originalKey: z.string(),
  thumbnailKey: z.string(),
  thumbnailWidth: z.number(),
  thumbnailHeight: z.number(),
});

const REPLACE_ORIGINAL_ERROR_MESSAGES: Record<
  ActionFailureReason<ReplaceOriginalResult>,
  string
> = {
  invalid_input: REPLACE_FAILED,
  rate_limited: RATE_LIMITED_MESSAGE,
  post_not_found: POST_NOT_FOUND,
  post_not_editable: POST_NOT_EDITABLE,
  file_invalid: FILE_INVALID,
  storage_limit_exceeded: STORAGE_LIMIT_EXCEEDED,
};

export async function replaceOriginalAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = replaceOriginalInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: REPLACE_ORIGINAL_ERROR_MESSAGES.invalid_input };
  }
  const { publicId } = parsed.data;

  const result = await replaceOriginal({
    publicId,
    userId: session.user.id,
    originalKey: parsed.data.originalKey,
    thumbnailKey: parsed.data.thumbnailKey,
    thumbnailWidth: parsed.data.thumbnailWidth,
    thumbnailHeight: parsed.data.thumbnailHeight,
  });
  if (!result.ok) {
    return { ok: false, error: REPLACE_ORIGINAL_ERROR_MESSAGES[result.reason] };
  }

  revalidatePostPages({ boardId: result.boardId, publicId });
  return { ok: true };
}
