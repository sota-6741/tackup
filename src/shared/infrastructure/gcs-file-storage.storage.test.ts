import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import {
  TEST_STORAGE_BUCKET,
  testStorageClient,
} from "@/shared/testing/test-storage";
import {
  CONTENT_LENGTH_RANGE_HEADER,
  makeGcsFileStorage,
  SIGNED_URL_EXPIRES_IN_SECONDS,
} from "./gcs-file-storage";

const storage = makeGcsFileStorage({
  storage: testStorageClient,
  bucket: TEST_STORAGE_BUCKET,
});

const pdf = new TextEncoder().encode("%PDF-1.7 test");

function newKey() {
  return `test/${randomUUID()}.pdf`;
}

test("署名付きの URL でアップロードし、署名付きの URL で取得できる", async () => {
  const key = newKey();
  const { url, headers } = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: pdf.length,
  });

  const upload = await fetch(url, { method: "PUT", headers, body: pdf });
  expect(upload.status).toBe(200);

  const download = await fetch(await storage.createDownloadUrl(key));
  expect(download.status).toBe(200);
  expect(new Uint8Array(await download.arrayBuffer())).toEqual(pdf);
});

test("アップロードの URL は、種類とサイズと有効期限を署名に含める", async () => {
  const { url: uploadUrl } = await storage.createUploadUrl({
    key: newKey(),
    contentType: "application/pdf",
    size: 1234,
  });
  const url = new URL(uploadUrl);

  expect(url.searchParams.get("X-Goog-SignedHeaders")).toBe(
    `content-type;host;${CONTENT_LENGTH_RANGE_HEADER}`,
  );
  expect(url.searchParams.get("X-Goog-Expires")).toBe(
    String(SIGNED_URL_EXPIRES_IN_SECONDS),
  );
});

test("アップロードのときに付けるヘッダーとして、署名した種類とサイズを返す", async () => {
  const { headers } = await storage.createUploadUrl({
    key: newKey(),
    contentType: "application/pdf",
    size: 1234,
  });

  expect(headers).toEqual({
    "content-type": "application/pdf",
    [CONTENT_LENGTH_RANGE_HEADER]: "1234,1234",
  });
});

test("取得の URL は、有効期限を署名に含める", async () => {
  const url = new URL(await storage.createDownloadUrl(newKey()));

  expect(url.searchParams.get("X-Goog-Expires")).toBe(
    String(SIGNED_URL_EXPIRES_IN_SECONDS),
  );
  expect(url.searchParams.get("X-Goog-Signature")).not.toBeNull();
});
