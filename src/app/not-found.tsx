import { getSession } from "@/modules/auth/presentation/session";
import { NotFoundMessage } from "@/shared/presentation/components/not-found-message";

export default async function NotFound() {
  const session = await getSession();
  if (session) {
    return <NotFoundMessage href="/boards" linkLabel="掲示板へ戻る" />;
  }
  return <NotFoundMessage href="/" linkLabel="トップへ" />;
}
