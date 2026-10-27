import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { getCurrentInviteUrlAction, reissueInviteTokenAction } from "./actions";
import { InviteLinkSection } from "./invite-link-section";

vi.mock("./actions", () => ({
  getCurrentInviteUrlAction: vi.fn(),
  reissueInviteTokenAction: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(getCurrentInviteUrlAction).mockReset();
  vi.mocked(reissueInviteTokenAction).mockReset();
});

const inviteUrl = "https://tackup.example.com/b/token-old";
const latestUrl = "https://tackup.example.com/b/token-latest";

test("招待リンクの URL を表示する", () => {
  render(
    <InviteLinkSection boardId="board-1" inviteUrl={inviteUrl} canReissue />,
  );

  expect(screen.getByLabelText("招待リンク")).toHaveValue(inviteUrl);
});

function renderSection() {
  render(
    <InviteLinkSection
      boardId="board-1"
      inviteUrl={inviteUrl}
      canReissue={false}
    />,
  );
}

test("コピーすると今の招待リンクを取り直して書き込み、ほかの画面で再発行されていれば表示も差し替える", async () => {
  vi.mocked(getCurrentInviteUrlAction).mockResolvedValue({
    ok: true,
    inviteUrl: latestUrl,
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  renderSection();

  fireEvent.click(screen.getByRole("button", { name: "コピー" }));

  expect(
    await screen.findByRole("button", { name: "コピーしました" }),
  ).toBeInTheDocument();
  expect(getCurrentInviteUrlAction).toHaveBeenCalledWith("board-1");
  expect(writeText).toHaveBeenCalledWith(latestUrl);
  expect(screen.getByLabelText("招待リンク")).toHaveValue(latestUrl);
});

test("ClipboardItem を使えるブラウザでは、押した時点で書き込みを始め、中身は取り直した URL にする", async () => {
  vi.mocked(getCurrentInviteUrlAction).mockResolvedValue({
    ok: true,
    inviteUrl: latestUrl,
  });
  const items: Record<string, Promise<Blob>>[] = [];
  vi.stubGlobal(
    "ClipboardItem",
    class {
      constructor(item: Record<string, Promise<Blob>>) {
        items.push(item);
      }
    },
  );
  const write = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { write, writeText: vi.fn() } });
  renderSection();

  fireEvent.click(screen.getByRole("button", { name: "コピー" }));

  expect(write).toHaveBeenCalledOnce();
  expect(
    await screen.findByRole("button", { name: "コピーしました" }),
  ).toBeInTheDocument();
  expect(await (await items[0]["text/plain"]).text()).toBe(latestUrl);
});

test("取り直せなかったときは、理由を表示してコピーしない", async () => {
  vi.mocked(getCurrentInviteUrlAction).mockResolvedValue({
    ok: false,
    error:
      "この掲示板は非公開になったため、招待リンクはありません。画面を読み込み直してください。",
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  renderSection();

  fireEvent.click(screen.getByRole("button", { name: "コピー" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "この掲示板は非公開になったため",
  );
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "コピー" })).toBeInTheDocument();
});

test("クリップボードを使えないときは、取り直した URL を選択状態にする", async () => {
  vi.mocked(getCurrentInviteUrlAction).mockResolvedValue({
    ok: true,
    inviteUrl: latestUrl,
  });
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  renderSection();
  const input = screen.getByLabelText<HTMLInputElement>("招待リンク");

  fireEvent.click(screen.getByRole("button", { name: "コピー" }));

  await waitFor(() => expect(input.selectionEnd).toBe(latestUrl.length));
  expect(input).toHaveValue(latestUrl);
  expect(screen.getByRole("button", { name: "コピー" })).toBeInTheDocument();
});

test("再発行できないときは、再発行のボタンを表示しない", () => {
  render(
    <InviteLinkSection
      boardId="board-1"
      inviteUrl={inviteUrl}
      canReissue={false}
    />,
  );

  expect(
    screen.queryByRole("button", { name: "再発行" }),
  ).not.toBeInTheDocument();
});

test("確認してから再発行し、表示中の URL を新しいリンクに差し替える", async () => {
  vi.mocked(reissueInviteTokenAction).mockResolvedValue({
    ok: true,
    inviteUrl: "https://tackup.example.com/b/token-new",
  });
  render(
    <InviteLinkSection boardId="board-1" inviteUrl={inviteUrl} canReissue />,
  );

  fireEvent.click(screen.getByRole("button", { name: "再発行" }));
  expect(reissueInviteTokenAction).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "再発行する" }));

  expect(reissueInviteTokenAction).toHaveBeenCalledWith("board-1");
  await waitFor(() =>
    expect(screen.getByLabelText("招待リンク")).toHaveValue(
      "https://tackup.example.com/b/token-new",
    ),
  );
});

test("再発行できなかったときは、ダイアログに理由を表示し URL を変えない", async () => {
  vi.mocked(reissueInviteTokenAction).mockResolvedValue({
    ok: false,
    error: "再発行できませんでした。",
  });
  render(
    <InviteLinkSection boardId="board-1" inviteUrl={inviteUrl} canReissue />,
  );

  fireEvent.click(screen.getByRole("button", { name: "再発行" }));
  fireEvent.click(await screen.findByRole("button", { name: "再発行する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "再発行できませんでした。",
  );
  expect(screen.getByLabelText("招待リンク")).toHaveValue(inviteUrl);
});
