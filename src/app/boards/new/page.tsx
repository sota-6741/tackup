import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/presentation/session";
import { CreateBoardForm } from "@/modules/board/presentation/create-board-form";

export default async function NewBoardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
      <h1 className="font-semibold text-2xl tracking-tight">掲示板を作成</h1>
      <CreateBoardForm />
    </div>
  );
}
