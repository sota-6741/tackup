import { Button } from "@/shared/presentation/components/ui/button";

/** 想定外の障害のときに出す。原因は利用者に伝えず、再試行だけを促す。 */
export function ErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="font-semibold text-xl">問題が発生しました</h1>
      <p className="text-muted-foreground text-sm">
        時間をおいて、もう一度お試しください。
      </p>
      <Button onClick={() => onRetry()}>もう一度試す</Button>
    </div>
  );
}
