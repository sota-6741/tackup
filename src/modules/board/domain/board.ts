export type Board = {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const BOARD_NAME_MAX_LENGTH = 50;

export type BoardNameError = "name_empty" | "name_too_long";

export type ParseBoardNameResult =
  | { ok: true; name: string }
  | { ok: false; reason: BoardNameError };

export function parseBoardName(value: string): ParseBoardNameResult {
  const name = value.trim();
  if (name.length === 0) {
    return { ok: false, reason: "name_empty" };
  }
  if (name.length > BOARD_NAME_MAX_LENGTH) {
    return { ok: false, reason: "name_too_long" };
  }
  return { ok: true, name };
}
