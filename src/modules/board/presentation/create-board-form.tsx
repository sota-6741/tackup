"use client";

import { useActionState } from "react";
import { BOARD_NAME_MAX_LENGTH } from "@/modules/board/domain/board";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/presentation/components/ui/radio-group";
import { type CreateBoardState, createBoardAction } from "./actions";

const initialState: CreateBoardState = {
  error: null,
  values: { name: "", isPublic: false },
};

export function CreateBoardForm() {
  const [state, formAction, pending] = useActionState(
    createBoardAction,
    initialState,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="board-name">
          掲示板名 <span className="text-muted-foreground">*</span>
        </Label>
        <Input
          id="board-name"
          name="name"
          required
          maxLength={BOARD_NAME_MAX_LENGTH}
          defaultValue={state.values.name}
          aria-invalid={state.error ? true : undefined}
          aria-describedby="board-name-message"
        />
        {state.error ? (
          <p
            id="board-name-message"
            role="alert"
            className="text-destructive text-sm"
          >
            {state.error}
          </p>
        ) : (
          <p id="board-name-message" className="text-muted-foreground text-sm">
            {BOARD_NAME_MAX_LENGTH}文字以内
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p id="board-visibility-label" className="font-medium text-sm">
          公開設定
        </p>
        <RadioGroup
          name="visibility"
          defaultValue={state.values.isPublic ? "public" : "private"}
          aria-labelledby="board-visibility-label"
          className="gap-4"
        >
          <label className="flex items-start gap-3">
            <RadioGroupItem value="private" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">非公開</span>
              <span className="text-muted-foreground text-sm">
                メンバーだけが閲覧できます
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <RadioGroupItem value="public" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">公開</span>
              <span className="text-muted-foreground text-sm">
                招待リンクと QR コードからログインなしで閲覧できます
              </span>
            </span>
          </label>
        </RadioGroup>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "作成中…" : "作成する"}
        </Button>
      </div>
    </form>
  );
}
