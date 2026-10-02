import { GlobeIcon, LockIcon } from "lucide-react";
import type { Role } from "@/modules/board/domain/board-member";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { InviteLinkSection } from "./invite-link-section";

type BoardHeaderProps = {
  boardId: string;
  name: string;
  isPublic: boolean;
  memberRole: Role;
  /** 非公開の掲示板では `null`。 */
  inviteUrl: string | null;
};

export function BoardHeader({
  boardId,
  name,
  isPublic,
  memberRole,
  inviteUrl,
}: BoardHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words font-semibold text-2xl tracking-tight">
          {name}
        </h1>
        {isPublic ? (
          <Badge variant="secondary">
            <GlobeIcon />
            公開
          </Badge>
        ) : (
          <Badge variant="secondary">
            <LockIcon />
            非公開
          </Badge>
        )}
      </div>
      {inviteUrl && (
        <InviteLinkSection
          key={inviteUrl}
          boardId={boardId}
          inviteUrl={inviteUrl}
          canReissue={memberRole === "admin"}
        />
      )}
    </header>
  );
}
