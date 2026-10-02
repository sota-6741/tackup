import { afterEach, expect, test, vi } from "vitest";
import { devSignIn, isDevSignInEnabled } from "./dev-sign-in";

const mocks = vi.hoisted(() => ({
  env: { DEV_SIGN_IN: undefined as string | undefined },
  createSessionCookies: vi.fn(),
}));

vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("./auth", () => ({ authOptions: {} }));
vi.mock("./test-auth", () => ({
  makeCreateSessionCookies: () => mocks.createSessionCookies,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.env.DEV_SIGN_IN = undefined;
  mocks.createSessionCookies.mockReset();
});

function given({ nodeEnv, flag }: { nodeEnv: string; flag?: string }) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  mocks.env.DEV_SIGN_IN = flag;
}

test("next dev で動かしていて DEV_SIGN_IN が true のときだけ有効になる", () => {
  given({ nodeEnv: "development", flag: "true" });

  expect(isDevSignInEnabled()).toBe(true);
});

test.each([
  ["DEV_SIGN_IN を立てていない", { nodeEnv: "development" }],
  ["DEV_SIGN_IN が false", { nodeEnv: "development", flag: "false" }],
  ["本番ビルド", { nodeEnv: "production", flag: "true" }],
  ["テスト", { nodeEnv: "test", flag: "true" }],
])("%s ときは有効にならない", (_, condition) => {
  given(condition);

  expect(isDevSignInEnabled()).toBe(false);
});

test("有効なときは、開発用ユーザーのセッションの Cookie を返す", async () => {
  given({ nodeEnv: "development", flag: "true" });
  const cookies = [{ name: "better-auth.session_token", value: "signed" }];
  mocks.createSessionCookies.mockResolvedValue(cookies);

  expect(await devSignIn()).toBe(cookies);
  expect(mocks.createSessionCookies).toHaveBeenCalledWith({
    email: "dev@tackup.invalid",
    name: "開発用ユーザー",
  });
});

test("本番ビルドでは DEV_SIGN_IN を立てても、セッションを作らずに null を返す", async () => {
  given({ nodeEnv: "production", flag: "true" });

  expect(await devSignIn()).toBeNull();
  expect(mocks.createSessionCookies).not.toHaveBeenCalled();
});
