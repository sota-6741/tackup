"use client";

import "./globals.css";
import { ErrorMessage } from "@/shared/presentation/components/error-message";

/** ルートのレイアウトそのものが失敗したとき。レイアウトの代わりに描くので、html と body とグローバルの CSS を自分で持つ。 */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>問題が発生しました - tackup</title>
        <ErrorMessage onRetry={retry} />
      </body>
    </html>
  );
}
