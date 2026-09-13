import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { signIn } from "./auth-client";
import { SignInButton } from "./sign-in-button";

vi.mock("./auth-client", () => ({ signIn: { social: vi.fn() } }));

test("signs in with Google and returns to the dashboard", () => {
  render(<SignInButton />);

  const button = screen.getByRole("button", { name: "Google でサインイン" });
  expect(button).toBeInTheDocument();

  fireEvent.click(button);
  expect(signIn.social).toHaveBeenCalledWith({
    provider: "google",
    callbackURL: "/dashboard",
  });
});
