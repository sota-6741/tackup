import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PostListItem } from "@/modules/post/application/list-posts";
import { PostList } from "./post-list";

vi.mock("./actions", () => ({ removePostAction: vi.fn() }));

function postListItem(overrides: Partial<PostListItem>): PostListItem {
  return {
    publicId: "public-1",
    title: "夏祭りのお知らせ",
    thumbnailUrl: "https://storage.example.com/thumbnail-1",
    thumbnailWidth: 565,
    thumbnailHeight: 800,
    publishFrom: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-11-01T00:00:00Z"),
    state: "published",
    removedAt: null,
    canRemove: true,
    canEdit: true,
    ...overrides,
  };
}

test("掲示物がなければ、ないことを表示する", () => {
  render(<PostList boardId="board-1" posts={[]} nextHref={null} />);

  expect(screen.getByText("まだ掲示物はありません")).toBeInTheDocument();
});

test.each([
  ["draft", "下書き"],
  ["upcoming", "掲示開始前"],
  ["published", "公開中"],
  ["expired", "期限切れ・撤去待ち"],
  ["removed", "撤去済み"],
] as const)("状態が %s の掲示物には「%s」と表示する", (state, label) => {
  render(
    <PostList
      boardId="board-1"
      posts={[postListItem({ state })]}
      nextHref={null}
    />,
  );

  expect(screen.getByText(label)).toBeInTheDocument();
});

test("タイトルは掲示物詳細へのリンクで、掲示期間を表示する。無期限なら「無期限」と出す", () => {
  render(
    <PostList
      boardId="board-1"
      posts={[
        postListItem({}),
        postListItem({
          publicId: "public-2",
          title: "清掃の案内",
          expiresAt: null,
        }),
      ]}
      nextHref={null}
    />,
  );

  expect(
    screen.getByRole("link", { name: "夏祭りのお知らせ" }),
  ).toHaveAttribute("href", "/posts/public-1");
  expect(screen.getByText(/無期限/)).toBeInTheDocument();
});

test("撤去済みにできる掲示物にだけ「撤去済みにする」を出し、撤去済みには撤去の日時を出す", () => {
  const { container } = render(
    <PostList
      boardId="board-1"
      posts={[
        postListItem({}),
        postListItem({
          publicId: "public-2",
          title: "去年の夏祭り",
          state: "removed",
          canRemove: false,
          canEdit: false,
          removedAt: new Date("2026-10-10T00:00:00Z"),
        }),
      ]}
      nextHref={null}
    />,
  );

  expect(
    screen.getAllByRole("button", { name: "撤去済みにする" }),
  ).toHaveLength(1);
  expect(screen.getByText(/撤去:/)).toBeInTheDocument();
  expect(
    container.querySelector('time[datetime="2026-10-10T00:00:00.000Z"]'),
  ).not.toBeNull();
});

test("続きがあれば、続きのページへのリンクを表示する", () => {
  render(
    <PostList
      boardId="board-1"
      posts={[postListItem({})]}
      nextHref="/boards/board-1/posts?after=cursor"
    />,
  );

  expect(screen.getByRole("link", { name: "続きを見る" })).toHaveAttribute(
    "href",
    "/boards/board-1/posts?after=cursor",
  );
});

test("編集できる掲示物にだけ、編集の画面へのリンクを出す", () => {
  render(
    <PostList
      boardId="board-1"
      posts={[
        postListItem({}),
        postListItem({
          publicId: "public-2",
          title: "去年の夏祭り",
          state: "removed",
          canRemove: false,
          canEdit: false,
        }),
      ]}
      nextHref={null}
    />,
  );

  const links = screen.getAllByRole("link", { name: "編集" });
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute(
    "href",
    "/boards/board-1/posts/public-1/edit",
  );
});
