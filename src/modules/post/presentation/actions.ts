"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createUploadUrls, registerPost } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";
import type {
  CreateUploadUrlsResult,
  UploadTarget,
} from "@/modules/post/application/create-upload-urls";
import type { RegisterPostResult } from "@/modules/post/application/register-post";
import { ORIGINAL_FILE_MAX_SIZE } from "@/modules/post/domain/original-file";
import { POST_TITLE_MAX_LENGTH } from "@/modules/post/domain/post";

const MAX_SIZE_MB = ORIGINAL_FILE_MAX_SIZE / 1024 / 1024;
const UNEXPECTED_INPUT =
  "登録できませんでした。画面を読み込み直して、もう一度お試しください。";
const FORBIDDEN = "この掲示板に掲示物を登録できません。";
const STORAGE_LIMIT_EXCEEDED =
  "この掲示板で保存できるファイルの容量の上限に達しています。";

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
  Extract<CreateUploadUrlsResult, { ok: false }>["reason"],
  string
> = {
  board_not_found: FORBIDDEN,
  forbidden: FORBIDDEN,
  content_type_not_allowed: "PDF・JPEG・PNG・WebP のファイルを選んでください。",
  size_invalid: "空のファイルは選べません。",
  file_too_large: `${MAX_SIZE_MB}MB 以下のファイルを選んでください。`,
  thumbnail_invalid: UNEXPECTED_INPUT,
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
  publishFrom: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  originalKey: z.string(),
  thumbnailKey: z.string(),
  thumbnailWidth: z.number(),
  thumbnailHeight: z.number(),
});

export type RegisterPostActionResult =
  | { ok: true }
  | { ok: false; error: string };

const REGISTER_POST_ERROR_MESSAGES: Record<
  Extract<RegisterPostResult, { ok: false }>["reason"],
  string
> = {
  board_not_found: FORBIDDEN,
  forbidden: FORBIDDEN,
  title_empty: "タイトルを入力してください。",
  title_too_long: `タイトルは${POST_TITLE_MAX_LENGTH}文字以内で入力してください。`,
  period_invalid: "掲示開始と掲示終了の日時を入力してください。",
  expires_before_publish: "掲示終了は、掲示開始より後の日時にしてください。",
  file_invalid:
    "ファイルを確認できませんでした。ファイルを選び直して、もう一度お試しください。",
  post_limit_exceeded: "この掲示板に登録できる掲示物の数の上限に達しています。",
  storage_limit_exceeded: STORAGE_LIMIT_EXCEEDED,
};

export async function registerPostAction(
  input: unknown,
): Promise<RegisterPostActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = registerPostInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: UNEXPECTED_INPUT };
  const { boardId } = parsed.data;

  const result = await registerPost({
    boardId,
    userId: session.user.id,
    title: parsed.data.title,
    publishFrom: new Date(parsed.data.publishFrom),
    expiresAt: new Date(parsed.data.expiresAt),
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
