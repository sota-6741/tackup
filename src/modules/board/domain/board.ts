import { ValidationError } from "@/shared/domain/errors";

export type Board = {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const BOARD_NAME_MAX_LENGTH = 50;

export function parseBoardName(value: string): string {
  const name = value.trim();
  if (name.length === 0) {
    throw new ValidationError("掲示板名を入力してください。");
  }
  if (name.length > BOARD_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `掲示板名は${BOARD_NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return name;
}
