import { randomBytes } from "node:crypto";

/** 公開の URL（`/posts/{publicId}`）に使うので、推測できない値にする。 */
export function generatePublicId(): string {
  return randomBytes(16).toString("base64url");
}
