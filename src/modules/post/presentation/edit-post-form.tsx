"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/presentation/components/ui/button";
import { updatePostAction } from "./actions";
import { toDatetimeLocalValue } from "./datetime-local";
import {
  EMPTY_POST_FIELD_VALUES,
  PostFields,
  type PostFieldValues,
  parsePostFields,
} from "./post-fields";

type EditPostFormProps = {
  publicId: string;
  boardId: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  /** ISO 8601。タイムゾーンを知っているのはブラウザだけなので、入力欄の値にはブラウザで直す。 */
  publishFrom: string;
  /** 無期限なら `null`。 */
  expiresAt: string | null;
};

export function EditPostForm({
  publicId,
  boardId,
  title,
  description,
  externalUrl,
  publishFrom,
  expiresAt,
}: EditPostFormProps) {
  const [fields, setFields] = useState<PostFieldValues>({
    ...EMPTY_POST_FIELD_VALUES,
    title,
    description: description ?? "",
    externalUrl: externalUrl ?? "",
    unlimited: expiresAt === null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // サーバーとブラウザでタイムゾーンが違うので、日時はブラウザで描画したあとに入れる。
  useEffect(() => {
    setFields((current) => ({
      ...current,
      publishFrom: toDatetimeLocalValue(new Date(publishFrom)),
      expiresAt: expiresAt ? toDatetimeLocalValue(new Date(expiresAt)) : "",
    }));
  }, [publishFrom, expiresAt]);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePostFields(fields);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePostAction({
        publicId,
        title: parsed.fields.title,
        description: parsed.fields.description,
        externalUrl: parsed.fields.externalUrl,
        publishFrom: parsed.fields.publishFromIso,
        expiresAt: parsed.fields.expiresAtIso,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/boards/${boardId}/posts`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <PostFields values={fields} onChange={setFields} />
      <div className="flex flex-col items-end gap-3">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
