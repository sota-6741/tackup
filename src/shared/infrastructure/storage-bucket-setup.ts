import type { Storage } from "@google-cloud/storage";
import { CONTENT_LENGTH_RANGE_HEADER } from "./gcs-file-storage";

/** ローカルのエミュレーター専用（`bun run storage:setup` とストレージのテスト）。本番と CI の実バケットは、公開アクセスの防止などを含めて gcloud で作る（README）。 */
export async function setUpBucket({
  storage,
  bucket,
  allowedOrigins,
}: {
  storage: Storage;
  bucket: string;
  allowedOrigins: string[];
}): Promise<void> {
  const target = storage.bucket(bucket);
  const [exists] = await target.exists();
  if (!exists) {
    await target.create();
  }

  await target.setCorsConfiguration([
    {
      origin: allowedOrigins,
      method: ["PUT", "GET"],
      responseHeader: ["content-type", CONTENT_LENGTH_RANGE_HEADER],
      maxAgeSeconds: 3600,
    },
  ]);
}
