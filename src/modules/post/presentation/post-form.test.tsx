import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createUploadUrlsAction, registerPostAction } from "./actions";
import { createThumbnail } from "./create-thumbnail";
import { PostForm } from "./post-form";
import { uploadFile } from "./upload-file";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./actions", () => ({
  createUploadUrlsAction: vi.fn(),
  registerPostAction: vi.fn(),
}));
vi.mock("./create-thumbnail", () => ({ createThumbnail: vi.fn() }));
vi.mock("./upload-file", () => ({ uploadFile: vi.fn() }));

const pdf = new File(["%PDF-1.7"], "夏祭りのお知らせ.pdf", {
  type: "application/pdf",
});
const thumbnailBlob = new Blob(["thumbnail"], { type: "image/webp" });
const targets = {
  original: {
    uploadUrl: "https://storage.example.com/original",
    uploadHeaders: { "content-type": "application/pdf" },
    key: "pending/board-1/user-1/original",
  },
  thumbnail: {
    uploadUrl: "https://storage.example.com/thumbnail",
    uploadHeaders: { "content-type": "image/webp" },
    key: "pending/board-1/user-1/thumbnail",
  },
};

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:thumbnail",
    revokeObjectURL: () => {},
  });
  vi.mocked(createThumbnail).mockResolvedValue({
    ok: true,
    blob: thumbnailBlob,
    contentType: "image/webp",
    width: 565,
    height: 800,
  });
  vi.mocked(createUploadUrlsAction).mockResolvedValue({ ok: true, ...targets });
  vi.mocked(uploadFile).mockResolvedValue(true);
  vi.mocked(registerPostAction).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

async function selectFile(file: File) {
  fireEvent.change(screen.getByLabelText(/ファイル/), {
    target: { files: [file] },
  });
}

async function fillAndSubmit() {
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");
  fireEvent.change(screen.getByLabelText(/掲示開始/), {
    target: { value: "2026-10-01T09:00" },
  });
  fireEvent.change(screen.getByLabelText(/掲示終了/), {
    target: { value: "2026-11-01T09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "登録する" }));
}

test("ファイルを選ぶとサムネイルを表示し、タイトルにファイル名を入れる", async () => {
  render(<PostForm boardId="board-1" />);

  await selectFile(pdf);

  expect(await screen.findByAltText("サムネイル")).toHaveAttribute(
    "src",
    "blob:thumbnail",
  );
  expect(screen.getByLabelText(/タイトル/)).toHaveValue("夏祭りのお知らせ");
  expect(createThumbnail).toHaveBeenCalledWith({
    file: pdf,
    contentType: "application/pdf",
  });
});

test("先に入力したタイトルは、ファイルを選んでも書き換えない", async () => {
  render(<PostForm boardId="board-1" />);
  fireEvent.change(screen.getByLabelText(/タイトル/), {
    target: { value: "自分で付けた名前" },
  });

  await selectFile(pdf);
  await screen.findByAltText("サムネイル");

  expect(screen.getByLabelText(/タイトル/)).toHaveValue("自分で付けた名前");
});

test("許可しない形式のファイルは、サムネイルを作らずに理由を表示する", async () => {
  render(<PostForm boardId="board-1" />);

  await selectFile(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "PDF・JPEG・PNG・WebP のファイルを選んでください。",
  );
  expect(createThumbnail).not.toHaveBeenCalled();
});

test("PDF として読めないファイルは、理由を表示する", async () => {
  vi.mocked(createThumbnail).mockResolvedValue({
    ok: false,
    reason: "pdf_unreadable",
  });
  render(<PostForm boardId="board-1" />);

  await selectFile(pdf);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "PDF を読み込めませんでした。",
  );
});

test("ファイルを選ばずに登録しようとすると、ファイルを選ぶよう表示する", async () => {
  render(<PostForm boardId="board-1" />);

  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "ファイルを選んでください。",
  );
  expect(createUploadUrlsAction).not.toHaveBeenCalled();
});

test("掲示終了を入れずに登録しようとすると、日時を入れるよう表示する", async () => {
  render(<PostForm boardId="board-1" />);
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");

  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "掲示開始と掲示終了の日時を入力してください。",
  );
  expect(createUploadUrlsAction).not.toHaveBeenCalled();
});

test("掲示終了が掲示開始より前だと、アップロードせずに理由を表示する", async () => {
  render(<PostForm boardId="board-1" />);
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");
  fireEvent.change(screen.getByLabelText(/掲示開始/), {
    target: { value: "2026-10-01T09:00" },
  });
  fireEvent.change(screen.getByLabelText(/掲示終了/), {
    target: { value: "2026-09-30T09:00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "掲示終了は、掲示開始より後の日時にしてください。",
  );
  expect(createUploadUrlsAction).not.toHaveBeenCalled();
});

test("タイトルを空にすると、アップロードせずに理由を表示する", async () => {
  render(<PostForm boardId="board-1" />);
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");
  fireEvent.change(screen.getByLabelText(/タイトル/), {
    target: { value: " " },
  });
  fireEvent.change(screen.getByLabelText(/掲示終了/), {
    target: { value: "2099-12-31T23:59" },
  });

  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "タイトルを入力してください。",
  );
  expect(createUploadUrlsAction).not.toHaveBeenCalled();
});

test("登録すると、URL を発行し、ファイルとサムネイルをアップロードしてから登録し、掲示板ボードへ移動する", async () => {
  render(<PostForm boardId="board-1" />);

  await fillAndSubmit();

  await waitFor(() => expect(push).toHaveBeenCalledWith("/boards/board-1"));
  expect(createUploadUrlsAction).toHaveBeenCalledWith({
    boardId: "board-1",
    original: { contentType: "application/pdf", size: pdf.size },
    thumbnail: { contentType: "image/webp", size: thumbnailBlob.size },
  });
  expect(uploadFile).toHaveBeenCalledWith({
    target: targets.original,
    body: pdf,
  });
  expect(uploadFile).toHaveBeenCalledWith({
    target: targets.thumbnail,
    body: thumbnailBlob,
  });
  expect(registerPostAction).toHaveBeenCalledWith({
    boardId: "board-1",
    title: "夏祭りのお知らせ",
    publishFrom: new Date(2026, 9, 1, 9, 0).toISOString(),
    expiresAt: new Date(2026, 10, 1, 9, 0).toISOString(),
    originalKey: targets.original.key,
    thumbnailKey: targets.thumbnail.key,
    thumbnailWidth: 565,
    thumbnailHeight: 800,
  });
});

test("無期限にすると、掲示終了を入れなくても登録でき、掲示終了は null で送る", async () => {
  render(<PostForm boardId="board-1" />);
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");
  fireEvent.change(screen.getByLabelText(/掲示開始/), {
    target: { value: "2026-10-01T09:00" },
  });

  fireEvent.click(screen.getByRole("checkbox", { name: "無期限にする" }));
  expect(screen.getByLabelText(/掲示終了/)).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  await waitFor(() => expect(push).toHaveBeenCalledWith("/boards/board-1"));
  expect(registerPostAction).toHaveBeenCalledWith(
    expect.objectContaining({
      publishFrom: new Date(2026, 9, 1, 9, 0).toISOString(),
      expiresAt: null,
    }),
  );
});

test("無期限にしたあとに外すと、入れてあった掲示終了で登録する", async () => {
  render(<PostForm boardId="board-1" />);
  await selectFile(pdf);
  await screen.findByAltText("サムネイル");
  fireEvent.change(screen.getByLabelText(/掲示開始/), {
    target: { value: "2026-10-01T09:00" },
  });
  fireEvent.change(screen.getByLabelText(/掲示終了/), {
    target: { value: "2026-11-01T09:00" },
  });

  fireEvent.click(screen.getByRole("checkbox", { name: "無期限にする" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "無期限にする" }));
  fireEvent.click(screen.getByRole("button", { name: "登録する" }));

  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(registerPostAction).toHaveBeenCalledWith(
    expect.objectContaining({
      expiresAt: new Date(2026, 10, 1, 9, 0).toISOString(),
    }),
  );
});

test("URL を発行できなければ理由を表示し、アップロードしない", async () => {
  vi.mocked(createUploadUrlsAction).mockResolvedValue({
    ok: false,
    error: "この掲示板で保存できるファイルの容量の上限に達しています。",
  });
  render(<PostForm boardId="board-1" />);

  await fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "この掲示板で保存できるファイルの容量の上限に達しています。",
  );
  expect(uploadFile).not.toHaveBeenCalled();
});

test("アップロードに失敗したら、登録せずにやり直すよう表示する", async () => {
  vi.mocked(uploadFile)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);
  render(<PostForm boardId="board-1" />);

  await fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "アップロードできませんでした。",
  );
  expect(registerPostAction).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

test("登録できなければ理由を表示し、画面を移動しない", async () => {
  vi.mocked(registerPostAction).mockResolvedValue({
    ok: false,
    error: "掲示終了は、掲示開始より後の日時にしてください。",
  });
  render(<PostForm boardId="board-1" />);

  await fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "掲示終了は、掲示開始より後の日時にしてください。",
  );
  expect(push).not.toHaveBeenCalled();
  // エラーの表示のすぐあとに、送信中の状態が終わってボタンが戻る。
  expect(await screen.findByRole("button", { name: "登録する" })).toBeEnabled();
});
