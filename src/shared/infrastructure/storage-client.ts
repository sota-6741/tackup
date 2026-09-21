import { Storage } from "@google-cloud/storage";

export type StorageClientConfig = {
  apiEndpoint?: string;
  projectId?: string;
};

/**
 * 本番は Cloud Run のサービスアカウントで署名する（鍵ファイルを持たない）。
 * ローカルとテストは、接続先をエミュレーターに向け、`GOOGLE_APPLICATION_CREDENTIALS` の使い捨ての鍵で署名する。
 */
export function makeStorageClient({
  apiEndpoint,
  projectId,
}: StorageClientConfig): Storage {
  return new Storage({ apiEndpoint, projectId });
}
