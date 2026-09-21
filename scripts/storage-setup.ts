import { env } from "@/env";
import { setUpBucket } from "@/shared/infrastructure/storage-bucket-setup";
import { makeStorageClient } from "@/shared/infrastructure/storage-client";
import { ensureDevSigningKey } from "./dev-signing-key";

const apiEndpoint = env.STORAGE_API_ENDPOINT;
if (!apiEndpoint) {
  throw new Error(
    "STORAGE_API_ENDPOINT が未設定です。このスクリプトはローカルのエミュレーター専用です。本番のバケットと CORS は gcloud で設定してください（README の「本番に出すとき」）",
  );
}

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
