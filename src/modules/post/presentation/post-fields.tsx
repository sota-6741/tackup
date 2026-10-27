import {
  POST_DESCRIPTION_MAX_LENGTH,
  POST_EXTERNAL_URL_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  parsePostDescription,
  parsePostExternalUrl,
  parsePostTitle,
  parsePublishPeriod,
} from "@/modules/post/domain/post";
import { Checkbox } from "@/shared/presentation/components/ui/checkbox";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { Textarea } from "@/shared/presentation/components/ui/textarea";
import { datetimeLocalToIso } from "./datetime-local";
import { POST_INPUT_ERROR_MESSAGES } from "./post-messages";

/** 掲示期間は `<input type="datetime-local">` の値（その端末のタイムゾーン）のまま持つ。 */
export type PostFieldValues = {
  title: string;
  publishFrom: string;
  expiresAt: string;
  unlimited: boolean;
  description: string;
  externalUrl: string;
};

export const EMPTY_POST_FIELD_VALUES: PostFieldValues = {
  title: "",
  publishFrom: "",
  expiresAt: "",
  unlimited: false,
  description: "",
  externalUrl: "",
};

export type ParsedPostFields = {
  title: string;
  description: string;
  externalUrl: string;
  publishFromIso: string;
  /** 無期限なら `null`。 */
  expiresAtIso: string | null;
};

/** サーバーでも同じ決まりを確かめる。ここで先に確かめるのは、保存できない入力のためにアップロードや送信をしないため。 */
export function parsePostFields(
  values: PostFieldValues,
): { ok: true; fields: ParsedPostFields } | { ok: false; message: string } {
  const postTitle = parsePostTitle(values.title);
  if (!postTitle.ok) {
    return { ok: false, message: POST_INPUT_ERROR_MESSAGES[postTitle.reason] };
  }
  const optional = [
    parsePostDescription(values.description),
    parsePostExternalUrl(values.externalUrl),
  ].find((result) => !result.ok);
  if (optional && !optional.ok) {
    return { ok: false, message: POST_INPUT_ERROR_MESSAGES[optional.reason] };
  }
  const publishFromIso = datetimeLocalToIso(values.publishFrom);
  const expiresAtIso = values.unlimited
    ? null
    : datetimeLocalToIso(values.expiresAt);
  if (!publishFromIso || (!values.unlimited && !expiresAtIso)) {
    return { ok: false, message: POST_INPUT_ERROR_MESSAGES.period_invalid };
  }
  const period = parsePublishPeriod({
    publishFrom: new Date(publishFromIso),
    expiresAt: expiresAtIso === null ? null : new Date(expiresAtIso),
  });
  if (!period.ok) {
    return { ok: false, message: POST_INPUT_ERROR_MESSAGES[period.reason] };
  }
  return {
    ok: true,
    fields: {
      title: values.title,
      description: values.description,
      externalUrl: values.externalUrl,
      publishFromIso,
      expiresAtIso,
    },
  };
}

/** 登録と編集で共通の入力欄（タイトル・掲示期間・説明文・外部リンク）。 */
export function PostFields({
  values,
  onChange,
}: {
  values: PostFieldValues;
  onChange: (values: PostFieldValues) => void;
}) {
  function set<TKey extends keyof PostFieldValues>(
    key: TKey,
    value: PostFieldValues[TKey],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="post-title">
          タイトル <span className="text-muted-foreground">*</span>
        </Label>
        <Input
          id="post-title"
          required
          maxLength={POST_TITLE_MAX_LENGTH}
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          aria-describedby="post-title-message"
        />
        <p id="post-title-message" className="text-muted-foreground text-sm">
          {POST_TITLE_MAX_LENGTH}文字以内
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="post-publish-from">
            掲示開始 <span className="text-muted-foreground">*</span>
          </Label>
          <Input
            id="post-publish-from"
            type="datetime-local"
            required
            value={values.publishFrom}
            onChange={(event) => set("publishFrom", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="post-expires-at">
            掲示終了{" "}
            {!values.unlimited && (
              <span className="text-muted-foreground">*</span>
            )}
          </Label>
          <Input
            id="post-expires-at"
            type="datetime-local"
            required={!values.unlimited}
            disabled={values.unlimited}
            min={values.publishFrom}
            value={values.unlimited ? "" : values.expiresAt}
            onChange={(event) => set("expiresAt", event.target.value)}
          />
          <Label className="font-normal">
            <Checkbox
              checked={values.unlimited}
              onCheckedChange={(checked) => set("unlimited", checked)}
            />
            無期限にする
          </Label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="post-description">説明文</Label>
        <Textarea
          id="post-description"
          rows={4}
          maxLength={POST_DESCRIPTION_MAX_LENGTH}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          aria-describedby="post-description-message"
        />
        <p
          id="post-description-message"
          className="text-muted-foreground text-sm"
        >
          {POST_DESCRIPTION_MAX_LENGTH}文字以内（省略できます）
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="post-external-url">外部リンク</Label>
        <Input
          id="post-external-url"
          type="url"
          inputMode="url"
          placeholder="https://"
          maxLength={POST_EXTERNAL_URL_MAX_LENGTH}
          value={values.externalUrl}
          onChange={(event) => set("externalUrl", event.target.value)}
          aria-describedby="post-external-url-message"
        />
        <p
          id="post-external-url-message"
          className="text-muted-foreground text-sm"
        >
          申し込みフォームや詳しい案内のページなど（省略できます）
        </p>
      </div>
    </>
  );
}
