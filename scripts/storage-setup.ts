import { env } from "@/env";
import { setUpBucket } from "@/shared/infrastructure/storage-bucket-setup";
import { makeStorageClient } from "@/shared/infrastructure/storage-client";
import { assertLocalStorageEndpoint } from "@/shared/testing/local-storage-endpoint";
import { ensureDevSigningKey } from "./dev-signing-key";

const apiEndpoint = assertLocalStorageEndpoint(env.STORAGE_API_ENDPOINT);

const keyPath = ensureDevSigningKey();

const storage = makeStorageClient({ apiEndpoint, projectId: "tackup-dev" });

await setUpBucket({
  storage,
  bucket: env.STORAGE_BUCKET,
  allowedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
});

console.log(
  `バケット ${env.STORAGE_BUCKET} を準備しました（署名用の鍵: ${keyPath}）`,
);
