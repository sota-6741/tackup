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

async function put(key: string, body: Uint8Array<ArrayBuffer>) {
  const { url, headers } = await storage.createUploadUrl({
    key,
    contentType: "application/pdf",
    size: body.length,
  });
  const upload = await fetch(url, { method: "PUT", headers, body });
  expect(upload.status).toBe(200);
}

async function exists(key: string) {
  const [found] = await testStorageClient
    .bucket(TEST_STORAGE_BUCKET)
    .file(key)
    .exists();
  return found;
}

test("先頭のバイトと、保存されている種類・サイズ・世代を読める", async () => {
  const key = newKey();
  await put(key, pdf);

  const head = await storage.readHead({ key, length: 5 });

  expect(head).toMatchObject({
    bytes: new TextEncoder().encode("%PDF-"),
    contentType: "application/pdf",
    size: pdf.length,
  });
  expect(head?.generation).toMatch(/^\d+$/);
});

test("ファイルが指定した長さより短ければ、あるだけのバイトを読む", async () => {
  const key = newKey();
  await put(key, pdf);

  const head = await storage.readHead({ key, length: 100 });

  expect(head?.bytes).toEqual(pdf);
});

test("ないファイルの先頭を読むと null を返す", async () => {
  expect(await storage.readHead({ key: newKey(), length: 5 })).toBeNull();
});

test("読んだ世代のままなら移せて、元の場所からはなくなる", async () => {
  const from = newKey();
  const to = newKey();
  await put(from, pdf);
  const head = await storage.readHead({ key: from, length: 5 });
  if (!head) throw new Error("アップロードしたファイルを読めない");

  const moved = await storage.move({ from, to, generation: head.generation });

  expect(moved).toBe(true);
  expect(await exists(from)).toBe(false);
  const download = await fetch(await storage.createDownloadUrl(to));
  expect(new Uint8Array(await download.arrayBuffer())).toEqual(pdf);
  expect(download.headers.get("content-type")).toBe("application/pdf");
});

test("読んだあとに上書きされたファイルは移さない", async () => {
  const from = newKey();
  const to = newKey();
  await put(from, pdf);
  const head = await storage.readHead({ key: from, length: 5 });
  if (!head) throw new Error("アップロードしたファイルを読めない");
  await put(from, new TextEncoder().encode("<html>差し替えた中身</html>"));

  const moved = await storage.move({ from, to, generation: head.generation });

  expect(moved).toBe(false);
  expect(await exists(to)).toBe(false);
});

test("ないファイルは移さない", async () => {
  const moved = await storage.move({
    from: newKey(),
    to: newKey(),
    generation: "1",
  });

  expect(moved).toBe(false);
});

test("ファイルを消せる。ないファイルを消してもエラーにならない", async () => {
  const key = newKey();
  await put(key, pdf);

  await storage.delete(key);
  await storage.delete(key);

  expect(await exists(key)).toBe(false);
});

test("保存用の URL には、ファイル名を付けて保存させる指定が入る", async () => {
  const url = new URL(
    await storage.createSaveUrl({ key: newKey(), fileName: "夏祭り.pdf" }),
  );

  const disposition = url.searchParams.get("response-content-disposition");
  expect(disposition).toContain("attachment");
  expect(disposition).toContain("夏祭り.pdf");
  expect(url.searchParams.get("X-Goog-Signature")).not.toBeNull();
});
