/** ログイン後の既定の移動先。 */
export const DEFAULT_RETURN_PATH = "/boards";

/**
 * ログイン後に戻る先。URL から来る値なので、このアプリの中のパスだけを通す。
 * `//example.com` や `/\example.com` は、ブラウザが別のサイトの URL として読む。通すと、ログイン直後に別のサイトへ飛ばされる。
 */
export function parseReturnPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_RETURN_PATH;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字を含むパスを弾くための指定
  if (!/^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/.test(value)) {
    return DEFAULT_RETURN_PATH;
  }
  return value;
}

/** サインイン画面の URL。`returnPath` を、ログイン後の戻り先として渡す。 */
export function signInPath(returnPath: string): string {
  return `/sign-in?next=${encodeURIComponent(returnPath)}`;
}
