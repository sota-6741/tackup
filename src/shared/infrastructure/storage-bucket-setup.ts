import type { Storage } from "@google-cloud/storage";
import { CONTENT_LENGTH_RANGE_HEADER } from "./gcs-file-storage";

/** ローカルのエミュレーターと CI 用。本番のバケットと CORS は gcloud で設定する（README）。 */
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
