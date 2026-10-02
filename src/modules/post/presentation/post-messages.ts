import {
  POST_DESCRIPTION_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  type PostTitleError,
  type PublishPeriodError,
} from "@/modules/post/domain/post";

/** フォーム（アップロードの前の確認）と Server Action の両方が使う。 */
export const POST_INPUT_ERROR_MESSAGES: Record<
  | PostTitleError
  | PublishPeriodError
  | "description_too_long"
  | "external_url_invalid",
  string
> = {
  description_too_long: `説明文は${POST_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`,
  external_url_invalid:
    "外部リンクは、http:// か https:// で始まる URL を入力してください。",
  title_empty: "タイトルを入力してください。",
  title_too_long: `タイトルは${POST_TITLE_MAX_LENGTH}文字以内で入力してください。`,
  period_invalid: "掲示開始と掲示終了の日時を入力してください。",
  expires_before_publish: "掲示終了は、掲示開始より後の日時にしてください。",
};
