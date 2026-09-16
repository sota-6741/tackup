import { redirect } from "next/navigation";
import { listMyBoards } from "@/di/board";
import { getSession } from "@/modules/auth/presentation/session";
import { BoardSidebar } from "@/modules/board/presentation/board-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/presentation/components/ui/sidebar";

export default async function BoardsLayout({
  children,
}: LayoutProps<"/boards">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const boards = await listMyBoards(session.user.id);

  return (
    <SidebarProvider>
      <BoardSidebar
        boards={boards}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-3 md:hidden">
          <SidebarTrigger />
          <p className="font-semibold text-base">tackup</p>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
