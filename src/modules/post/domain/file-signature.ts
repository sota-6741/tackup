import type { OriginalContentType } from "./original-file";

/** 形式を見分けるのに要る、ファイルの先頭のバイト数。 */
export const FILE_SIGNATURE_LENGTH = 12;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];
const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/** ファイルの先頭のバイト（マジックバイト）から形式を見分ける。許可する形式のどれでもなければ `null`。申告された `Content-Type` は中身を保証しないので、これで確かめる。 */
export function detectContentType(
  bytes: Uint8Array,
): OriginalContentType | null {
  if (startsWith(bytes, PDF)) return "application/pdf";
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return "image/webp";
  }
  return null;
}
