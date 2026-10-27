"use client";

import { ErrorMessage } from "@/shared/presentation/components/error-message";

/** /boards の外（掲示物詳細・招待リンク・サインインなど）の障害。/boards の下は boards/error.tsx がレイアウトの中で受ける。 */
export default function RootError({ retry }: { retry: () => void }) {
  return <ErrorMessage onRetry={retry} />;
}
