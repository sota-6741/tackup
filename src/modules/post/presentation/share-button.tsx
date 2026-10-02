"use client";

import { CheckIcon, Share2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/presentation/components/ui/button";

const MESSAGE_DURATION_MS = 2000;

type Outcome = "copied" | "failed";

const MESSAGES: Record<Outcome, string> = {
  copied: "URL をコピーしました",
  failed: "URL をコピーできませんでした",
};

/** 利用者が共有をやめたときも、共有できたときと同じに扱う。共有の機能がない・使えないときは例外になる。 */
async function shareWithBrowser(data: ShareData): Promise<void> {
  try {
    await navigator.share(data);
  } catch (error) {
    // `DOMException` が `Error` を継承していない環境があるので、名前だけで見分ける。
    if ((error as { name?: unknown } | null)?.name === "AbortError") return;
    throw error;
  }
}

/** ブラウザの共有の機能を使う。使えないブラウザでは、このページの URL をコピーする。 */
export function ShareButton({ title }: { title: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!outcome) return;
    const timer = setTimeout(() => setOutcome(null), MESSAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  async function share() {
    const url = window.location.href;
    try {
      await shareWithBrowser({ title, url });
      return;
    } catch {
      // 共有の機能を使えないときは、下で URL をコピーする。
    }
    try {
      await navigator.clipboard.writeText(url);
      setOutcome("copied");
    } catch {
      setOutcome("failed");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={share}>
      {outcome === "copied" ? <CheckIcon /> : <Share2Icon />}
      <span aria-live="polite">{outcome ? MESSAGES[outcome] : "共有する"}</span>
    </Button>
  );
}
