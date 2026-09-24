import { randomUUID } from "node:crypto";

export function generateUploadKey(): string {
  return `pending/${randomUUID()}`;
}
