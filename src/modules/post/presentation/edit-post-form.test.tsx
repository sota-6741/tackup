import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { updatePostAction } from "./actions";
import { EditPostForm } from "./edit-post-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./actions", () => ({ updatePostAction: vi.fn() }));

beforeEach(() => {
  push.mockReset();
  vi.mocked(updatePostAction).mockReset();
});

function renderForm(expiresAt: string | null = "2026-11-01T00:00:00.000Z") {
  render(
    <EditPostForm
      publicId="public-1"
      boardId="board-1"
      title="夏祭りのお知らせ"
      description="雨天中止です"
      externalUrl={null}
      publishFrom="2026-10-01T00:00:00.000Z"
      expiresAt={expiresAt}
    />,
  );
}

test("今の値を入力欄に入れる。日時はブラウザのタイムゾーンで出す", async () => {
  renderForm();

  expect(screen.getByLabelText(/タイトル/)).toHaveValue("夏祭りのお知らせ");
  expect(screen.getByLabelText("説明文")).toHaveValue("雨天中止です");
  expect(screen.getByLabelText("外部リンク")).toHaveValue("");
  await waitFor(() =>
    expect(screen.getByLabelText(/掲示開始/)).toHaveValue(
      toLocalValue("2026-10-01T00:00:00.000Z"),
    ),
  );
  expect(screen.getByLabelText(/掲示終了/)).toHaveValue(
    toLocalValue("2026-11-01T00:00:00.000Z"),
  );
});

test("無期限の掲示物は、無期限にするにチェックを入れて開く", async () => {
  renderForm(null);

  expect(screen.getByRole("checkbox", { name: "無期限にする" })).toBeChecked();
  expect(screen.getByLabelText(/掲示終了/)).toBeDisabled();
});

test("保存すると、入力した値を送り、掲示物一覧へ移動する", async () => {
  vi.mocked(updatePostAction).mockResolvedValue({
    ok: true,
    boardId: "board-1",
  });
  renderForm();
  await waitFor(() =>
    expect(screen.getByLabelText(/掲示開始/)).not.toHaveValue(""),
  );

  fireEvent.change(screen.getByLabelText(/タイトル/), {
    target: { value: "夏祭りのお知らせ（延期）" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/boards/board-1/posts"),
  );
  expect(updatePostAction).toHaveBeenCalledWith({
    publicId: "public-1",
    title: "夏祭りのお知らせ（延期）",
    description: "雨天中止です",
    externalUrl: "",
    publishFrom: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-11-01T00:00:00.000Z",
  });
});

test("入力が決まりに合わなければ、送らずに理由を表示する", async () => {
  renderForm();
  await waitFor(() =>
    expect(screen.getByLabelText(/掲示開始/)).not.toHaveValue(""),
  );

  fireEvent.change(screen.getByLabelText(/タイトル/), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "タイトルを入力してください。",
  );
  expect(updatePostAction).not.toHaveBeenCalled();
});

test("保存できなかったときは、理由を表示して移動しない", async () => {
  vi.mocked(updatePostAction).mockResolvedValue({
    ok: false,
    error: "撤去済みの掲示物は編集できません。",
  });
  renderForm();
  await waitFor(() =>
    expect(screen.getByLabelText(/掲示開始/)).not.toHaveValue(""),
  );

  fireEvent.click(screen.getByRole("button", { name: "保存する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "撤去済みの掲示物は編集できません。",
  );
  expect(push).not.toHaveBeenCalled();
});

function toLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
