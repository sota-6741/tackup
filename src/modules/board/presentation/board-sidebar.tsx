import { LockIcon, PlusIcon } from "lucide-react";
import type { Board } from "@/modules/board/domain/board";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/shared/presentation/components/ui/sidebar";
import { SidebarNavLink } from "./sidebar-nav-link";

type BoardSidebarProps = {
  boards: Board[];
};

export function BoardSidebar({ boards }: BoardSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <p className="px-2 font-semibold text-base">tackup</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>掲示板</SidebarGroupLabel>
          <SidebarGroupContent>
            {boards.length === 0 ? (
              <p className="px-2 py-1.5 text-muted-foreground text-xs">
                所属する掲示板はありません
              </p>
            ) : (
              <SidebarMenu>
                {boards.map((board) => (
                  <SidebarNavLink key={board.id} href={`/boards/${board.id}`}>
                    <span className="min-w-0 flex-1 truncate">
                      {board.name}
                    </span>
                    {!board.isPublic && (
                      <>
                        <LockIcon />
                        <span className="sr-only">（非公開）</span>
                      </>
                    )}
                  </SidebarNavLink>
                ))}
              </SidebarMenu>
            )}
            <SidebarMenu>
              <SidebarNavLink href="/boards/new">
                <PlusIcon />
                <span>掲示板を作成</span>
              </SidebarNavLink>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
