const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * バケットの作成・CORS の上書き・ファイルの全削除をする開発用の処理が、本物の Cloud Storage に向かないようにする。
 * `http` で自分のマシンを指す接続先だけを許し、それ以外（未設定・`https`・別のホスト）は例外で止める。
 */
export function assertLocalStorageEndpoint(
  endpoint: string | undefined,
): string {
  if (!endpoint) {
    throw new Error(
      "ストレージの接続先が未設定です。この処理はローカルのエミュレーター専用です",
    );
  }
  const url = URL.parse(endpoint);
  if (url?.protocol !== "http:" || !LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error(
      `ストレージの接続先 ${endpoint} はローカルのエミュレーターではありません。この処理はローカルのエミュレーター専用です`,
    );
  }
  return endpoint;
}
