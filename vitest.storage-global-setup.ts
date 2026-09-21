import { setUpBucket } from "./src/shared/infrastructure/storage-bucket-setup";
import { ensureDevSigningKey } from "./src/shared/testing/dev-signing-key";
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
}
