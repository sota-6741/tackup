"use client";

import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/presentation/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/presentation/components/ui/sidebar";
import { signOut } from "./auth-client";
import { getInitial } from "./get-initial";

type AccountMenuProps = {
  name: string;
  email: string;
  image: string | null;
};

export function AccountMenu({ name, email, image }: AccountMenuProps) {
  const router = useRouter();
  const displayName = name.trim() || email;

  function handleSignOut() {
    signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar>
              <AvatarImage src={image ?? undefined} alt="" />
              <AvatarFallback>{getInitial(name, email)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-medium">
              {displayName}
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <div className="px-2 py-1.5">
              <p className="truncate font-medium text-sm">{displayName}</p>
              <p className="truncate text-muted-foreground text-xs">{email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOutIcon />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
