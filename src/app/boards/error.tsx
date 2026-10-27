"use client";

import { ErrorMessage } from "@/shared/presentation/components/error-message";

export default function BoardsError({ retry }: { retry: () => void }) {
  return <ErrorMessage onRetry={retry} />;
}
