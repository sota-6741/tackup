"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { devSignIn } from "@/di/auth";
import { parseReturnPath } from "@/modules/auth/domain/return-path";

/** 開発用のサインインが有効でなければ、存在しない操作として扱う。 */
export async function devSignInAction(formData: FormData): Promise<void> {
  const sessionCookies = await devSignIn();
  if (!sessionCookies) notFound();

  const cookieStore = await cookies();
  for (const { name, value, ...options } of sessionCookies) {
    cookieStore.set(name, value, options);
  }
  // フォームの値は書き換えられるので、戻り先はここでも確かめる。
  redirect(parseReturnPath(formData.get("next")));
}
