/** ログに添える値。秘密の値（トークン・Cookie・SQL のパラメーターなど）や個人情報を入れない。 */
export type LogFields = Record<
  string,
  string | number | boolean | null | string[]
>;

/** `error` に渡したエラーは、出力するときに名前・メッセージ・コードだけにする。 */
export type LogOptions = { fields?: LogFields; error?: unknown };

/** ログの出力先。use case は、Repository と同じく外から受け取る。 */
export type Logger = {
  info: (message: string, options?: LogOptions) => void;
  warn: (message: string, options?: LogOptions) => void;
  error: (message: string, options?: LogOptions) => void;
};
