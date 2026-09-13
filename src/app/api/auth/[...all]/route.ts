import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/di/auth";

export const { GET, POST } = toNextJsHandler(auth);
