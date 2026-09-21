import { makeStorageClient } from "@/shared/infrastructure/storage-client";

export const TEST_STORAGE_BUCKET = "tackup-test";

export const TEST_STORAGE_ORIGIN = "http://localhost:3000";

export const testStorageClient = makeStorageClient({
  apiEndpoint: process.env.TEST_STORAGE_API_ENDPOINT ?? "http://127.0.0.1:4443",
  projectId: "tackup-dev",
});
