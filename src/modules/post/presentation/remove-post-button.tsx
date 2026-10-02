"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/presentation/components/ui/alert-dialog";
import { Button } from "@/shared/presentation/components/ui/button";
import { removePostAction } from "./actions";

/** 撤去済みは元に戻せないので、確認してから記録する。成功すると、一覧が読み込み直されてこの行が消える。 */
export function RemovePostButton({
  publicId,
  title,
}: {
  publicId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeOpen(next: boolean) {
    // 記録中に Esc などで閉じると、失敗したときの理由が見えなくなるため閉じさせない。
    if (!next && pending) return;
    setOpen(next);
    if (next) setError(null);
  }

  function remove() {
    startTransition(async () => {
      const result = await removePostAction(publicId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        撤去済みにする
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>「{title}」を撤去済みにしますか？</AlertDialogTitle>
          <AlertDialogDescription>
            実際の掲示物をはがしたあとに記録してください。撤去済みにすると、元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={pending}>
            {pending ? "記録中…" : "撤去済みにする"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
