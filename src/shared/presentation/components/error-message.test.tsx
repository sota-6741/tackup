import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ErrorMessage } from "./error-message";

test("原因は出さずに、もう一度試すボタンで再試行させる", () => {
  const onRetry = vi.fn();
  render(<ErrorMessage onRetry={onRetry} />);

  expect(
    screen.getByRole("heading", { name: "問題が発生しました" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

  expect(onRetry).toHaveBeenCalledOnce();
});
