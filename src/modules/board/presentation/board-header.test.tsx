import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { BoardHeader } from "./board-header";

test("掲示板名を見出しとして表示する", () => {
  render(<BoardHeader name="中野のボード" isPublic={false} />);

  expect(
    screen.getByRole("heading", { level: 1, name: "中野のボード" }),
  ).toBeInTheDocument();
});

test("非公開の掲示板には「非公開」と表示する", () => {
  render(<BoardHeader name="中野のボード" isPublic={false} />);

  expect(screen.getByText("非公開")).toBeInTheDocument();
  expect(screen.queryByText("公開")).not.toBeInTheDocument();
});

test("公開の掲示板には「公開」と表示する", () => {
  render(<BoardHeader name="中野のボード" isPublic={true} />);

  expect(screen.getByText("公開")).toBeInTheDocument();
  expect(screen.queryByText("非公開")).not.toBeInTheDocument();
});
