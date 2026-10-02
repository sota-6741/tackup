import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { reissueInviteTokenAction } from "./actions";
import { InviteLinkSection } from "./invite-link-section";

vi.mock("./actions", () => ({ reissueInviteTokenAction: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(reissueInviteTokenAction).mockReset();
});

const inviteUrl = "https://tackup.example.com/b/token-old";

test("招待リンクの URL を表示する", () => {
  render(
    <InviteLinkSection boardId="board-1" inviteUrl={inviteUrl} canReissue />,
  );

  expect(screen.getByLabelText("招待リンク")).toHaveValue(inviteUrl);
});

test("コピーすると URL をクリップボードに書き込み、コピーしたことを表示する", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(
    <InviteLinkSection
      boardId="board-1"
      inviteUrl={inviteUrl}
      canReissue={false}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "コピー" }));

  expect(writeText).toHaveBeenCalledWith(inviteUrl);
  expect(
    await screen.findByRole("button", { name: "コピーしました" }),
  ).toBeInTheDocument();
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
