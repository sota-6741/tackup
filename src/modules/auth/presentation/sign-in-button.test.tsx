import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { signIn } from "./auth-client";
import { SignInButton } from "./sign-in-button";

vi.mock("./auth-client", () => ({ signIn: { social: vi.fn() } }));

test("googleでサインインし、ボード画面にリダイレクトされる", () => {
  render(<SignInButton />);

  const button = screen.getByRole("button", { name: "Google でサインイン" });
  expect(button).toBeInTheDocument();

  fireEvent.click(button);
  expect(signIn.social).toHaveBeenCalledWith({
    provider: "google",
    callbackURL: "/boards",
  });
});
