import {
  detectContentType,
  FILE_SIGNATURE_LENGTH,
} from "@/modules/post/domain/file-signature";
import type { FileStorage } from "@/shared/domain/file-storage";

export type VerifiedFile<TContentType> = {
  contentType: TContentType;
  size: number;
  generation: string;
};

/** 申告された種類は中身を保証しないので、先頭のバイトから見分けた形式が、保存されている種類と同じであることを確かめる。 */
export async function verifyUploadedFile<TContentType extends string>({
  fileStorage,
  key,
  parse,
}: {
  fileStorage: FileStorage;
  key: string;
  parse: (file: {
    contentType: string;
    size: number;
  }) => { ok: true; contentType: TContentType; size: number } | { ok: false };
}): Promise<VerifiedFile<TContentType> | null> {
  const head = await fileStorage.readHead({
    key,
    length: FILE_SIGNATURE_LENGTH,
  });
  if (!head) return null;
  if (detectContentType(head.bytes) !== head.contentType) return null;

  const file = parse({ contentType: head.contentType, size: head.size });
  if (!file.ok) return null;
  return {
    contentType: file.contentType,
    size: file.size,
    generation: head.generation,
  };
}
