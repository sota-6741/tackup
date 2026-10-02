import { ApiError, type Storage } from "@google-cloud/storage";
import type {
  CreateUploadUrlInput,
  FileHead,
  FileStorage,
  UploadUrl,
} from "@/shared/domain/file-storage";

export const SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;

export const CONTENT_LENGTH_RANGE_HEADER = "x-goog-content-length-range";

/** ファイル（またはその世代）がない。 */
function isMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === 404;
}

/**
 * ヘッダーには ASCII 以外の文字をそのまま書けないので、RFC 5987 の形（`filename*=UTF-8''...`）でファイル名を渡す。
 * `filename="..."` に日本語をそのまま入れると、ブラウザによっては文字化けする。
 */
function attachmentDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename*=UTF-8''${encoded}`;
}

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
  }: CreateUploadUrlInput): Promise<UploadUrl> {
    const extensionHeaders = {
      [CONTENT_LENGTH_RANGE_HEADER]: `${size},${size}`,
    };
    const [url] = await storage.bucket(bucket).file(key).getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresAt(),
      contentType,
      extensionHeaders,
    });
    return {
      url,
      headers: { "content-type": contentType, ...extensionHeaders },
    };
  }

  async function createDownloadUrl(key: string): Promise<string> {
    const [url] = await storage.bucket(bucket).file(key).getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAt(),
    });
    return url;
  }

  async function createSaveUrl({
    key,
    fileName,
  }: {
    key: string;
    fileName: string;
  }): Promise<string> {
    const [url] = await storage
      .bucket(bucket)
      .file(key)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAt(),
        responseDisposition: attachmentDisposition(fileName),
      });
    return url;
  }

  /** メタデータを読んだあとに上書きされても中身が食い違わないよう、読んだ世代を指定して先頭のバイトを取る。 */
  async function readHead({
    key,
    length,
  }: {
    key: string;
    length: number;
  }): Promise<FileHead | null> {
    try {
      const [metadata] = await storage.bucket(bucket).file(key).getMetadata();
      const generation = String(metadata.generation);
      const [bytes] = await storage
        .bucket(bucket)
        .file(key, { generation })
        .download({ start: 0, end: length - 1 });
      return {
        bytes: new Uint8Array(bytes),
        contentType: metadata.contentType ?? "",
        size: Number(metadata.size),
        generation,
      };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  /**
   * SDK のコピーは `ifSourceGenerationMatch` を渡せないので、コピー元の世代を指定する（`sourceGeneration`）。その世代がなければ失敗するので、同じ条件になる。バケットのバージョニングが無効であることが前提（有効だと、上書きされても古い世代が残る）。
   * 移動先にすでにファイルがあれば、上書きせずに想定外のエラーにする（`ifGenerationMatch: 0`）。
   * コピーのあとの元ファイルの削除に失敗しても、移動は成功として扱う。`pending/` はライフサイクルで消える。
   */
  async function move({
    from,
    to,
    generation,
  }: {
    from: string;
    to: string;
    generation: string;
  }): Promise<boolean> {
    const source = storage.bucket(bucket).file(from, { generation });
    try {
      await source.copy(storage.bucket(bucket).file(to), {
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
    await source.delete({ ignoreNotFound: true }).catch(() => {});
    return true;
  }

  async function deleteFile(key: string): Promise<void> {
    await storage.bucket(bucket).file(key).delete({ ignoreNotFound: true });
  }

  return {
    createUploadUrl,
    createDownloadUrl,
    createSaveUrl,
    readHead,
    move,
    delete: deleteFile,
  };
}
