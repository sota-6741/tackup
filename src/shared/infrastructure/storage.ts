import { env } from "@/env";
import { makeGcsFileStorage } from "./gcs-file-storage";
import { makeStorageClient } from "./storage-client";

const storage = makeStorageClient({ apiEndpoint: env.STORAGE_API_ENDPOINT });

export const fileStorage = makeGcsFileStorage({
  storage,
  bucket: env.STORAGE_BUCKET,
});
