"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { devSignIn } from "@/di/auth";

/** 開発用のサインインが有効でなければ、存在しない操作として扱う。 */
export async function devSignInAction(): Promise<void> {
  const sessionCookies = await devSignIn();
  if (!sessionCookies) notFound();

  const cookieStore = await cookies();
  for (const { name, value, ...options } of sessionCookies) {
    cookieStore.set(name, value, options);
  }
  redirect("/boards");
}
