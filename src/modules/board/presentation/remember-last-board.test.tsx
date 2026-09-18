import { render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { LAST_BOARD_COOKIE } from "./last-board-cookie";
import { RememberLastBoard } from "./remember-last-board";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("表示した掲示板の ID を、1年間有効な Cookie に記録する", () => {
  vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  const set = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("cookieStore", { set });

  render(<RememberLastBoard boardId="board-1" />);

  expect(set).toHaveBeenCalledWith({
    name: LAST_BOARD_COOKIE,
    value: "board-1",
    path: "/",
    expires: new Date("2027-01-01T00:00:00Z").getTime(),
    sameSite: "lax",
  });
});

test("Cookie Store API が使えないときは、エラーにせず何もしない", () => {
  expect("cookieStore" in window).toBe(false);

  expect(() => render(<RememberLastBoard boardId="board-1" />)).not.toThrow();
});

test("何も表示しない", () => {
  vi.stubGlobal("cookieStore", { set: vi.fn().mockResolvedValue(undefined) });

  const { container } = render(<RememberLastBoard boardId="board-1" />);

  expect(container).toBeEmptyDOMElement();
});
