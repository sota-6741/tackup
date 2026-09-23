"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import type { CreateBoardResult } from "@/modules/board/application/create-board";
import { BOARD_NAME_MAX_LENGTH } from "@/modules/board/domain/board";

export type CreateBoardState = {
  error: string | null;
  values: {
    name: string;
    isPublic: boolean;
  };
};

const CREATE_BOARD_ERROR_MESSAGES: Record<
  Extract<CreateBoardResult, { ok: false }>["reason"],
  string
> = {
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
