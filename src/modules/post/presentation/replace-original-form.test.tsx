import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createReplacementUploadUrlsAction,
  replaceOriginalAction,
} from "./actions";
import { createThumbnail } from "./create-thumbnail";
import { ReplaceOriginalForm } from "./replace-original-form";
import { UPLOAD_FAILED_MESSAGE, uploadFile } from "./upload-file";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./actions", () => ({
  createReplacementUploadUrlsAction: vi.fn(),
  replaceOriginalAction: vi.fn(),
}));
vi.mock("./create-thumbnail", () => ({ createThumbnail: vi.fn() }));
vi.mock("./upload-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./upload-file")>()),
  uploadFile: vi.fn(),
}));

const png = new File(["png"], "新しいポスター.png", { type: "image/png" });
const thumbnailBlob = new Blob(["thumbnail"], { type: "image/webp" });
const targets = {
  original: {
    uploadUrl: "https://storage.example.com/original",
    uploadHeaders: { "content-type": "image/png" },
    key: "pending/board-1/user-1/original",
  },
  thumbnail: {
    uploadUrl: "https://storage.example.com/thumbnail",
    uploadHeaders: { "content-type": "image/webp" },
    key: "pending/board-1/user-1/thumbnail",
  },
};

beforeEach(() => {
  URL.createObjectURL = () => "blob:thumbnail";
  URL.revokeObjectURL = () => {};
  vi.mocked(createThumbnail).mockResolvedValue({
    ok: true,
    blob: thumbnailBlob,
    contentType: "image/webp",
    width: 800,
    height: 600,
  });
  vi.mocked(createReplacementUploadUrlsAction).mockResolvedValue({
    ok: true,
    ...targets,
  });
  vi.mocked(uploadFile).mockResolvedValue(true);
  vi.mocked(replaceOriginalAction).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.resetAllMocks();
});

async function selectAndSubmit() {
  fireEvent.change(screen.getByLabelText("新しいファイル"), {
    target: { files: [png] },
  });
  await screen.findByAltText("サムネイル");
  fireEvent.click(screen.getByRole("button", { name: "ファイルを差し替える" }));
}

test("ファイルを選んで差し替えると、アップロードしてから差し替え、画面を読み込み直す", async () => {
  render(<ReplaceOriginalForm publicId="public-1" />);

  await selectAndSubmit();

  expect(await screen.findByRole("status")).toHaveTextContent(
    "ファイルを差し替えました。",
  );
  expect(createReplacementUploadUrlsAction).toHaveBeenCalledWith({
    publicId: "public-1",
    original: { contentType: "image/png", size: png.size },
    thumbnail: { contentType: "image/webp", size: thumbnailBlob.size },
  });
  expect(uploadFile).toHaveBeenCalledWith({
    target: targets.original,
    body: png,
  });
  expect(uploadFile).toHaveBeenCalledWith({
    target: targets.thumbnail,
    body: thumbnailBlob,
  });
  expect(replaceOriginalAction).toHaveBeenCalledWith({
    publicId: "public-1",
    originalKey: targets.original.key,
    thumbnailKey: targets.thumbnail.key,
    thumbnailWidth: 800,
    thumbnailHeight: 600,
  });
  expect(refresh).toHaveBeenCalled();
  expect(screen.queryByAltText("サムネイル")).not.toBeInTheDocument();
});

test("ファイルを選ばずに押すと、何も送らずに理由を表示する", async () => {
  render(<ReplaceOriginalForm publicId="public-1" />);

  fireEvent.click(screen.getByRole("button", { name: "ファイルを差し替える" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "ファイルを選んでください。",
  );
  expect(createReplacementUploadUrlsAction).not.toHaveBeenCalled();
});

test("アップロード先を発行できなかったときは、理由を表示してアップロードしない", async () => {
  vi.mocked(createReplacementUploadUrlsAction).mockResolvedValue({
    ok: false,
    error: "撤去済みの掲示物は差し替えられません。",
  });
  render(<ReplaceOriginalForm publicId="public-1" />);

  await selectAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "撤去済みの掲示物は差し替えられません。",
  );
  expect(uploadFile).not.toHaveBeenCalled();
  expect(replaceOriginalAction).not.toHaveBeenCalled();
});

test("アップロードに失敗したときは、差し替えずに理由を表示する", async () => {
  vi.mocked(uploadFile).mockResolvedValue(false);
  render(<ReplaceOriginalForm publicId="public-1" />);

  await selectAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    UPLOAD_FAILED_MESSAGE,
  );
  expect(replaceOriginalAction).not.toHaveBeenCalled();
});

test("差し替えに失敗したときは、理由を表示して読み込み直さない", async () => {
  vi.mocked(replaceOriginalAction).mockResolvedValue({
    ok: false,
    error: "この掲示板で保存できるファイルの容量の上限に達しています。",
  });
  render(<ReplaceOriginalForm publicId="public-1" />);

  await selectAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "この掲示板で保存できるファイルの容量の上限に達しています。",
  );
  await waitFor(() => expect(refresh).not.toHaveBeenCalled());
  expect(screen.getByAltText("サムネイル")).toBeInTheDocument();
});

test("差し替えたあとに別のファイルを選ぶと、前の結果の表示を消す", async () => {
  render(<ReplaceOriginalForm publicId="public-1" />);
  await selectAndSubmit();
  await screen.findByRole("status");

  fireEvent.change(screen.getByLabelText("新しいファイル"), {
    target: { files: [png] },
  });

  await screen.findByAltText("サムネイル");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
