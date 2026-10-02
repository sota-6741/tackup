import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ShareButton } from "./share-button";

function stubNavigator({
  share,
  writeText,
}: {
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}) {
  vi.stubGlobal("navigator", {
    ...(share ? { share } : {}),
    ...(writeText ? { clipboard: { writeText } } : {}),
  });
}

function clickShare() {
  render(<ShareButton title="夏祭りのお知らせ" />);
  fireEvent.click(screen.getByRole("button", { name: "共有する" }));
}

afterEach(() => vi.unstubAllGlobals());

test("ブラウザの共有の機能があれば、タイトルと URL を渡す", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubNavigator({ share, writeText });

  clickShare();

  await waitFor(() =>
    expect(share).toHaveBeenCalledWith({
      title: "夏祭りのお知らせ",
      url: window.location.href,
    }),
  );
  expect(writeText).not.toHaveBeenCalled();
});

test("共有の機能がなければ、URL をコピーして知らせる", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubNavigator({ writeText });

  clickShare();

  expect(await screen.findByText("URL をコピーしました")).toBeVisible();
  expect(writeText).toHaveBeenCalledWith(window.location.href);
});

test("利用者が共有をやめたときは、URL をコピーしない", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("やめた", "AbortError"));
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubNavigator({ share, writeText });

  clickShare();

  await waitFor(() => expect(share).toHaveBeenCalled());
  // やめたあとの処理が終わるのを待ってから確かめる。
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "共有する" })).toBeVisible();
});

test("共有に失敗したときは、URL をコピーする", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("許可がない", "NotAllowedError"));
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubNavigator({ share, writeText });

  clickShare();

  expect(await screen.findByText("URL をコピーしました")).toBeVisible();
});

test("共有もコピーもできないときは、できなかったことを知らせる", async () => {
  stubNavigator({});

  clickShare();

  expect(await screen.findByText("URL をコピーできませんでした")).toBeVisible();
});
