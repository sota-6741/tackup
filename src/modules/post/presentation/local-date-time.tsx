"use client";

import { useEffect, useState } from "react";

function format(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

/** 日時を、見ている人の端末のタイムゾーンで表示する。サーバーは端末のタイムゾーンを知らないので、最初は日本時間で出し、ブラウザで描画したあとに直す。 */
export function LocalDateTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => format(iso, "Asia/Tokyo"));

  useEffect(() => {
    setText(format(iso));
  }, [iso]);

  return <time dateTime={iso}>{text}</time>;
}
