"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/presentation/components/ui/sidebar";

type SidebarNavLinkProps = {
  href: string;
  children: ReactNode;
};

export function SidebarNavLink({ href, children }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link href={href} />}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setOpenMobile(false)}
      >
        {children}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
