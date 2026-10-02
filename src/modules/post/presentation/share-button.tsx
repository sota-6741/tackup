"use client";

import { CheckIcon, Share2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/presentation/components/ui/button";

const COPIED_DURATION_MS = 2000;

/** ブラウザの共有の機能を使う。使えないブラウザでは、このページの URL をコピーする。 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      // 利用者が共有をやめたときも例外になる。何もしない。
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <Button type="button" variant="outline" onClick={share}>
      {copied ? <CheckIcon /> : <Share2Icon />}
      {copied ? "URL をコピーしました" : "共有する"}
    </Button>
  );
}
