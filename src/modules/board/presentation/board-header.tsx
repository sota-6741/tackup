import { GlobeIcon, LockIcon } from "lucide-react";
import { Badge } from "@/shared/presentation/components/ui/badge";

type BoardHeaderProps = {
  name: string;
  isPublic: boolean;
};

export function BoardHeader({ name, isPublic }: BoardHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-3">
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
    </header>
  );
}
