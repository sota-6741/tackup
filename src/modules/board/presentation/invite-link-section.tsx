"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { reissueInviteTokenAction } from "./actions";

const COPIED_DURATION_MS = 2000;

type InviteLinkSectionProps = {
  boardId: string;
  inviteUrl: string;
  canReissue: boolean;
};

export function InviteLinkSection({
  boardId,
  inviteUrl: initialInviteUrl,
  canReissue,
}: InviteLinkSectionProps) {
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // クリップボードを使えないときは、手でコピーできるよう URL を選択しておく。
      inputRef.current?.select();
    }
  }

  function changeDialogOpen(open: boolean) {
    setDialogOpen(open);
    if (open) setReissueError(null);
  }

  function reissue() {
    startTransition(async () => {
      const result = await reissueInviteTokenAction(boardId);
      if (!result.ok) {
        setReissueError(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl);
      setCopied(false);
      setDialogOpen(false);
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor="invite-link">招待リンク</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="invite-link"
          ref={inputRef}
          value={inviteUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 min-w-0 flex-1 basis-64 md:h-8"
        />
        <Button
          variant="outline"
          onClick={copy}
          className="h-11 md:h-8"
          aria-live="polite"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "コピーしました" : "コピー"}
        </Button>
        {canReissue && (
          <AlertDialog open={dialogOpen} onOpenChange={changeDialogOpen}>
            <AlertDialogTrigger
              render={<Button variant="outline" className="h-11 md:h-8" />}
            >
              <RefreshCwIcon />
              再発行
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  招待リンクを再発行しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  今のリンクは使えなくなります。リンクを共有している人には、新しいリンクを伝え直してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              {reissueError && (
                <p role="alert" className="text-destructive text-sm">
                  {reissueError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction onClick={reissue} disabled={pending}>
                  {pending ? "再発行中…" : "再発行する"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
