import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PostBoard } from "./post-board";

const post = {
  publicId: "public-1",
  title: "夏祭りのお知らせ",
  thumbnailUrl: "https://storage.example.com/thumbnail-1",
  thumbnailWidth: 565,
  thumbnailHeight: 800,
};

test("掲示物がなければ、ないことを表示する", () => {
  render(<PostBoard posts={[]} nextHref={null} />);

  expect(screen.getByText("まだ掲示物はありません")).toBeInTheDocument();
});

test("掲示物のサムネイルとタイトルを表示し、縦横比が先に決まるよう幅と高さを付ける", () => {
  const { container } = render(<PostBoard posts={[post]} nextHref={null} />);

  expect(screen.getByText("夏祭りのお知らせ")).toBeInTheDocument();
  const image = container.querySelector("img");
  expect(image).toHaveAttribute("src", post.thumbnailUrl);
  expect(image).toHaveAttribute("width", "565");
  expect(image).toHaveAttribute("height", "800");
  expect(screen.queryByText("まだ掲示物はありません")).not.toBeInTheDocument();
});

test("掲示物詳細への導線は、遷移先ができるまで出さない", () => {
  render(<PostBoard posts={[post]} nextHref={null} />);

  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("続きがあれば、続きのページへのリンクを表示する", () => {
  render(<PostBoard posts={[post]} nextHref="/boards/board-1?after=cursor" />);

  expect(screen.getByRole("link", { name: "続きを見る" })).toHaveAttribute(
    "href",
    "/boards/board-1?after=cursor",
  );
});
