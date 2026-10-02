import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { BoardHeader } from "./board-header";

vi.mock("./actions", () => ({ reissueInviteTokenAction: vi.fn() }));

const inviteUrl = "https://tackup.example.com/b/token-1";

test("掲示板名を見出しとして表示する", () => {
  render(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={false}
      memberRole="admin"
      inviteUrl={null}
    />,
  );

  expect(
    screen.getByRole("heading", { level: 1, name: "中野のボード" }),
  ).toBeInTheDocument();
});

test("非公開の掲示板には「非公開」と表示し、招待リンクは表示しない", () => {
  render(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={false}
      memberRole="admin"
      inviteUrl={null}
    />,
  );

  expect(screen.getByText("非公開")).toBeInTheDocument();
  expect(screen.queryByText("公開")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("招待リンク")).not.toBeInTheDocument();
});

test("公開の掲示板には「公開」と招待リンクを表示する", () => {
  render(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={true}
      memberRole="poster"
      inviteUrl={inviteUrl}
    />,
  );

  expect(screen.getByText("公開")).toBeInTheDocument();
  expect(screen.queryByText("非公開")).not.toBeInTheDocument();
  expect(screen.getByLabelText("招待リンク")).toHaveValue(inviteUrl);
});

test("admin にだけ再発行のボタンを表示する", () => {
  const { rerender } = render(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={true}
      memberRole="admin"
      inviteUrl={inviteUrl}
    />,
  );
  expect(screen.getByRole("button", { name: "再発行" })).toBeInTheDocument();

  rerender(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={true}
      memberRole="poster"
      inviteUrl={inviteUrl}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "再発行" }),
  ).not.toBeInTheDocument();
});

test("掲示物登録・撤去タスク・台帳の画面へのリンクを表示する", () => {
  render(
    <BoardHeader
      boardId="board-1"
      name="中野のボード"
      isPublic={false}
      memberRole="poster"
      inviteUrl={null}
    />,
  );

  expect(screen.getByRole("link", { name: "掲示物を登録" })).toHaveAttribute(
    "href",
    "/boards/board-1/posts/new",
  );
  expect(screen.getByRole("link", { name: "撤去タスク" })).toHaveAttribute(
    "href",
    "/boards/board-1/removals",
  );
  expect(screen.getByRole("link", { name: "台帳" })).toHaveAttribute(
    "href",
    "/boards/board-1/posts",
  );
});
