import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { removePostAction } from "./actions";
import { RemovePostButton } from "./remove-post-button";

vi.mock("./actions", () => ({ removePostAction: vi.fn() }));

beforeEach(() => {
  vi.mocked(removePostAction).mockReset();
});

function openDialog() {
  render(<RemovePostButton publicId="public-1" title="夏祭りのお知らせ" />);
  fireEvent.click(screen.getByRole("button", { name: "撤去済みにする" }));
  return screen.getByRole("alertdialog");
}

test("押しただけでは記録せず、確認のダイアログを出す", () => {
  const dialog = openDialog();

  expect(dialog).toHaveTextContent(
    "「夏祭りのお知らせ」を撤去済みにしますか？",
  );
  expect(dialog).toHaveTextContent("元に戻せません");
  expect(removePostAction).not.toHaveBeenCalled();
});

test("キャンセルすると、記録せずにダイアログを閉じる", async () => {
  openDialog();

  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  expect(removePostAction).not.toHaveBeenCalled();
});

test("確認すると、その掲示物を撤去済みにしてダイアログを閉じる", async () => {
  vi.mocked(removePostAction).mockResolvedValue({ ok: true });
  const dialog = openDialog();

  fireEvent.click(
    within(dialog).getByRole("button", { name: "撤去済みにする" }),
  );

  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  expect(removePostAction).toHaveBeenCalledWith("public-1");
});

test("失敗したときは、ダイアログを開いたまま理由を表示する", async () => {
  vi.mocked(removePostAction).mockResolvedValue({
    ok: false,
    error: "この掲示物は撤去済みにできません。",
  });
  const dialog = openDialog();

  fireEvent.click(
    within(dialog).getByRole("button", { name: "撤去済みにする" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "この掲示物は撤去済みにできません。",
  );
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});
