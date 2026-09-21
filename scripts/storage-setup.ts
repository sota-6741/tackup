import { env } from "@/env";
import { setUpBucket } from "@/shared/infrastructure/storage-bucket-setup";
import { makeStorageClient } from "@/shared/infrastructure/storage-client";
import { ensureDevSigningKey } from "@/shared/testing/dev-signing-key";

const keyPath = ensureDevSigningKey();

const storage = makeStorageClient({
  apiEndpoint: env.STORAGE_API_ENDPOINT,
  projectId: "tackup-dev",
});

await setUpBucket({
  storage,
  bucket: env.STORAGE_BUCKET,
  allowedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
});

console.log(
  `バケット ${env.STORAGE_BUCKET} を準備しました（署名用の鍵: ${keyPath}）`,
);
