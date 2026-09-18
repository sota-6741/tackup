"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBoard } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import { DomainError } from "@/shared/domain/errors";

export type CreateBoardState = {
  error: string | null;
  values: {
    name: string;
    isPublic: boolean;
  };
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

  let boardId: string;
  try {
    const board = await createBoard({
      name,
      isPublic,
      userId: session.user.id,
    });
    boardId = board.id;
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    return { error: error.message, values };
  }

  revalidatePath("/boards", "layout");
  redirect(`/boards/${boardId}`);
}
