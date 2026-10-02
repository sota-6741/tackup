import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RemovalTaskList } from "./removal-task-list";

vi.mock("./actions", () => ({ removePostAction: vi.fn() }));

const task = {
  publicId: "public-1",
  title: "夏祭りのお知らせ",
  thumbnailUrl: "https://storage.example.com/thumbnail-1",
  thumbnailWidth: 565,
  thumbnailHeight: 800,
  expiresAt: new Date("2026-10-01T00:00:00Z"),
};
const now = new Date("2026-10-04T00:00:00Z");

test("撤去が必要な掲示物がなければ、ないことを表示する", () => {
  render(<RemovalTaskList tasks={[]} now={now} nextHref={null} />);

  expect(
    screen.getByText("撤去が必要な掲示物はありません"),
  ).toBeInTheDocument();
});

test("サムネイル・掲示物詳細へのリンク・掲示終了・期限超過時間を表示する", () => {
  const { container } = render(
    <RemovalTaskList tasks={[task]} now={now} nextHref={null} />,
  );

  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    task.thumbnailUrl,
  );
  expect(
    screen.getByRole("link", { name: "夏祭りのお知らせ" }),
  ).toHaveAttribute("href", "/posts/public-1");
  expect(container.querySelector("time")).toHaveAttribute(
    "datetime",
    "2026-10-01T00:00:00.000Z",
  );
  expect(screen.getByText("3日超過")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "撤去済みにする" }),
  ).toBeInTheDocument();
});

test("続きがあれば、続きのページへのリンクを表示する", () => {
  render(
    <RemovalTaskList
      tasks={[task]}
      now={now}
      nextHref="/boards/board-1/removals?after=cursor"
    />,
  );

  expect(screen.getByRole("link", { name: "続きを見る" })).toHaveAttribute(
    "href",
    "/boards/board-1/removals?after=cursor",
  );
});
