import "server-only";

export { auth } from "@/modules/auth/infrastructure/auth";
export {
  devSignIn,
  isDevSignInEnabled,
} from "@/modules/auth/infrastructure/dev-sign-in";
