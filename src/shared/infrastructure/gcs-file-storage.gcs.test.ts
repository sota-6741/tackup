import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import type { UploadUrl } from "@/shared/domain/file-storage";
import { makeGcsFileStorage } from "./gcs-file-storage";
import { makeStorageClient } from "./storage-client";

const bucket = process.env.GCS_TEST_BUCKET;
if (!bucket) {
  throw new Error(
    "GCS_TEST_BUCKET が未設定です。本物の Cloud Storage に対するテストなので、開発用のバケットと認証情報が必要です（README の「本番に出すとき」を参照）",
  );
}

const storage = makeGcsFileStorage({
  storage: makeStorageClient({}),
  bucket,
});

const pdf = new TextEncoder().encode("%PDF-1.7 test");

function newKey() {
  return `ci/${randomUUID()}.pdf`;
}

async function upload(
  { url, headers }: UploadUrl,
  body: Uint8Array<ArrayBuffer>,
) {
  const response = await fetch(url, { method: "PUT", headers, body });
  return response.status;
}

test("署名どおりのファイルはアップロードでき、署名付きの URL で取得できる", async () => {
  const key = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: pdf.length,
  });

  expect(await upload(uploadUrl, pdf)).toBe(200);

  const download = await fetch(await storage.createDownloadUrl(key));
  expect(download.status).toBe(200);
  expect(new Uint8Array(await download.arrayBuffer())).toEqual(pdf);
});

test("署名したサイズより大きいファイルは拒否される", async () => {
  const uploadUrl = await storage.createUploadUrl({
    key: newKey(),
    contentType: "application/pdf",
    size: pdf.length,
  });
  const larger = new TextEncoder().encode("%PDF-1.7 test with more bytes");

  expect(await upload(uploadUrl, larger)).not.toBe(200);
});

test("署名と違う種類のファイルは拒否される", async () => {
  const { url, headers } = await storage.createUploadUrl({
    key: newKey(),
    contentType: "application/pdf",
    size: pdf.length,
  });

  const status = await upload(
    { url, headers: { ...headers, "content-type": "text/html" } },
    pdf,
  );
  expect(status).not.toBe(200);
});

test("サイズの範囲のヘッダーを付けないと拒否される", async () => {
  const { url, headers } = await storage.createUploadUrl({
    key: newKey(),
    contentType: "application/pdf",
    size: pdf.length,
  });

  const status = await upload(
    { url, headers: { "content-type": headers["content-type"] } },
    pdf,
  );
  expect(status).not.toBe(200);
});

test("署名のない URL ではファイルを取得できない", async () => {
  const key = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await upload(uploadUrl, pdf)).toBe(200);

  const downloadUrl = new URL(await storage.createDownloadUrl(key));
  const unsigned = `${downloadUrl.origin}${downloadUrl.pathname}`;

  expect((await fetch(unsigned)).status).not.toBe(200);
});

test("期限が切れた URL ではファイルを取得できない", async () => {
  const key = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await upload(uploadUrl, pdf)).toBe(200);

  const [shortLived] = await makeStorageClient({})
    .bucket(bucket)
    .file(key)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 1000,
    });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect((await fetch(shortLived)).status).not.toBe(200);
});

test("先頭のバイトと、保存されている種類・サイズ・世代を読める", async () => {
  const key = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await upload(uploadUrl, pdf)).toBe(200);

  const head = await storage.readHead({ key, length: 5 });

  expect(head).toMatchObject({
    bytes: new TextEncoder().encode("%PDF-"),
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await storage.readHead({ key: newKey(), length: 5 })).toBeNull();
});

test("読んだ世代のままなら移せて、種類も引き継ぐ", async () => {
  const from = newKey();
  const to = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key: from,
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await upload(uploadUrl, pdf)).toBe(200);
  const head = await storage.readHead({ key: from, length: 5 });
  if (!head) throw new Error("アップロードしたファイルを読めない");

  expect(await storage.move({ from, to, generation: head.generation })).toBe(
    true,
  );

  expect(await storage.readHead({ key: from, length: 5 })).toBeNull();
  expect(await storage.readHead({ key: to, length: 5 })).toMatchObject({
    contentType: "application/pdf",
    size: pdf.length,
  });
  await storage.delete(to);
});

test("読んだあとに上書きされたファイルは移さない", async () => {
  const from = newKey();
  const to = newKey();
  const uploadUrl = await storage.createUploadUrl({
    key: from,
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(await upload(uploadUrl, pdf)).toBe(200);
  const head = await storage.readHead({ key: from, length: 5 });
  if (!head) throw new Error("アップロードしたファイルを読めない");
  expect(await upload(uploadUrl, pdf)).toBe(200);

  expect(await storage.move({ from, to, generation: head.generation })).toBe(
    false,
  );

  expect(await storage.readHead({ key: to, length: 5 })).toBeNull();
  await storage.delete(from);
});

test("移動先にすでにファイルがあれば、上書きせずに失敗する", async () => {
  const from = newKey();
  const to = newKey();
  for (const key of [from, to]) {
    const uploadUrl = await storage.createUploadUrl({
      key,
      contentType: "application/pdf",
      size: pdf.length,
    });
    expect(await upload(uploadUrl, pdf)).toBe(200);
  }
  const head = await storage.readHead({ key: from, length: 5 });
  if (!head) throw new Error("アップロードしたファイルを読めない");

  await expect(
    storage.move({ from, to, generation: head.generation }),
  ).rejects.toMatchObject({ code: 412 });

  expect(await storage.readHead({ key: from, length: 5 })).not.toBeNull();
  await storage.delete(from);
  await storage.delete(to);
});
