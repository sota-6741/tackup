import type { FileStorage } from "@/shared/domain/file-storage";

type StoredFile = {
  bytes: Uint8Array;
  contentType: string;
  generation: string;
};

/** `put` は、ブラウザが署名付きの URL へ PUT するのに当たる。上書きするたびに世代が変わる。 */
export function makeInMemoryFileStorage() {
  const files = new Map<string, StoredFile>();
  let generations = 0;

  function put({
    key,
    bytes,
    contentType,
  }: {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }): void {
    generations += 1;
    files.set(key, { bytes, contentType, generation: String(generations) });
  }

  const fileStorage: FileStorage = {
    async createUploadUrl({ key, contentType }) {
      return {
        url: `https://storage.example.com/${key}`,
        headers: { "content-type": contentType },
      };
    },
    async createDownloadUrl(key) {
      return `https://storage.example.com/${key}`;
    },
    async createSaveUrl({ key, fileName }) {
      return `https://storage.example.com/${key}?save=${encodeURIComponent(fileName)}`;
    },
    async readHead({ key, length }) {
      const file = files.get(key);
      if (!file) return null;
      return {
        bytes: file.bytes.slice(0, length),
        contentType: file.contentType,
        size: file.bytes.length,
        generation: file.generation,
      };
    },
    async move({ from, to, generation }) {
      const file = files.get(from);
      if (!file || file.generation !== generation) return false;
      files.delete(from);
      files.set(to, file);
      return true;
    },
    async delete(key) {
      files.delete(key);
    },
  };

  return { fileStorage, files, put };
}
