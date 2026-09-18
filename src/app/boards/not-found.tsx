import { NotFoundMessage } from "@/shared/presentation/components/not-found-message";

export default function BoardsNotFound() {
  return <NotFoundMessage href="/boards" linkLabel="掲示板へ戻る" />;
}
