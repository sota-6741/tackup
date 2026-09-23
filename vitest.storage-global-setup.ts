import { ensureDevSigningKey } from "./scripts/dev-signing-key";
import { setUpBucket } from "./src/shared/infrastructure/storage-bucket-setup";
import {
  TEST_STORAGE_BUCKET,
  TEST_STORAGE_ORIGIN,
  testStorageClient,
} from "./src/shared/testing/test-storage";

export default async function setup() {
  ensureDevSigningKey();
  await setUpBucket({
    storage: testStorageClient,
    bucket: TEST_STORAGE_BUCKET,
    allowedOrigins: [TEST_STORAGE_ORIGIN],
  });
  await testStorageClient.bucket(TEST_STORAGE_BUCKET).deleteFiles();
}
