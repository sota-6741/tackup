import type { Storage } from "@google-cloud/storage";
import type {
  CreateUploadUrlInput,
  FileStorage,
} from "@/shared/domain/file-storage";

export const SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;

export const CONTENT_LENGTH_RANGE_HEADER = "x-goog-content-length-range";

export function makeGcsFileStorage({
  storage,
  bucket,
}: {
  storage: Storage;
  bucket: string;
}): FileStorage {
  function expiresAt() {
    return Date.now() + SIGNED_URL_EXPIRES_IN_SECONDS * 1000;
  }

  /** 種類とサイズを署名に含めるので、違う種類・サイズのファイルは Cloud Storage に拒否される。 */
  async function createUploadUrl({
    key,
    contentType,
    size,
  }: CreateUploadUrlInput): Promise<string> {
    const [url] = await storage
      .bucket(bucket)
      .file(key)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt(),
        contentType,
        extensionHeaders: {
          [CONTENT_LENGTH_RANGE_HEADER]: `${size},${size}`,
        },
      });
    return url;
  }

  async function createDownloadUrl(key: string): Promise<string> {
    const [url] = await storage.bucket(bucket).file(key).getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAt(),
    });
    return url;
  }

  return { createUploadUrl, createDownloadUrl };
}
