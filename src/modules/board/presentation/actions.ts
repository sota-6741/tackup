"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBoard, reissueInviteToken } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import type { CreateBoardResult } from "@/modules/board/application/create-board";
import type { ReissueInviteTokenResult } from "@/modules/board/application/reissue-invite-token";
import { BOARD_NAME_MAX_LENGTH } from "@/modules/board/domain/board";
import type { RateLimited } from "@/shared/domain/rate-limiter";
import { RATE_LIMITED_MESSAGE } from "@/shared/presentation/lib/messages";

export type CreateBoardState = {
  error: string | null;
  values: {
    name: string;
    isPublic: boolean;
  };
};

const CREATE_BOARD_ERROR_MESSAGES: Record<
  Extract<CreateBoardResult | RateLimited, { ok: false }>["reason"],
  string
> = {
  rate_limited: RATE_LIMITED_MESSAGE,
  name_empty: "掲示板名を入力してください。",
  name_too_long: `掲示板名は${BOARD_NAME_MAX_LENGTH}文字以内で入力してください`,
};

export async function createBoardAction(
  _previousState: CreateBoardState,
  formData: FormData,
): Promise<CreateBoardState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const nameValue = formData.get("name");
  const name = typeof nameValue === "string" ? nameValue : "";
  const isPublic = formData.get("visibility") === "public";
  const values = { name, isPublic };

  const result = await createBoard({
    name,
    isPublic,
    userId: session.user.id,
  });
  if (!result.ok) {
    return { error: CREATE_BOARD_ERROR_MESSAGES[result.reason], values };
  }

  revalidatePath("/boards", "layout");
  redirect(`/boards/${result.board.id}`);
}

export type ReissueInviteTokenActionResult =
  | { ok: true; inviteUrl: string }
  | { ok: false; error: string };

const REISSUE_INVITE_TOKEN_ERROR_MESSAGES: Record<
  Extract<ReissueInviteTokenResult | RateLimited, { ok: false }>["reason"],
  string
> = {
  rate_limited: RATE_LIMITED_MESSAGE,
  board_not_found: "再発行できませんでした。",
  forbidden: "再発行できませんでした。",
  board_not_public: "再発行できませんでした。",
};

export async function reissueInviteTokenAction(
  boardId: unknown,
): Promise<ReissueInviteTokenActionResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (typeof boardId !== "string") {
    return {
      ok: false,
      error: REISSUE_INVITE_TOKEN_ERROR_MESSAGES.board_not_found,
    };
  }

  const result = await reissueInviteToken({
    boardId,
    userId: session.user.id,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: REISSUE_INVITE_TOKEN_ERROR_MESSAGES[result.reason],
    };
  }

  revalidatePath(`/boards/${boardId}`);
  return { ok: true, inviteUrl: result.inviteUrl };
}
