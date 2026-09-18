"use client";

import { Button } from "@/shared/presentation/components/ui/button";

export default function BoardsError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="font-semibold text-xl">問題が発生しました</h1>
      <p className="text-muted-foreground text-sm">
        時間をおいて、もう一度お試しください。
      </p>
      <Button onClick={() => retry()}>もう一度試す</Button>
    </div>
  );
}
