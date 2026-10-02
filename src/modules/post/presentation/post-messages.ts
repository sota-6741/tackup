import {
  POST_TITLE_MAX_LENGTH,
  type PostTitleError,
  type PublishPeriodError,
} from "@/modules/post/domain/post";

/** フォーム（アップロードの前の確認）と Server Action の両方が使う。 */
export const POST_INPUT_ERROR_MESSAGES: Record<
  PostTitleError | PublishPeriodError,
  string
> = {
  title_empty: "タイトルを入力してください。",
  title_too_long: `タイトルは${POST_TITLE_MAX_LENGTH}文字以内で入力してください。`,
  period_invalid: "掲示開始と掲示終了の日時を入力してください。",
  expires_before_publish: "掲示終了は、掲示開始より後の日時にしてください。",
};
