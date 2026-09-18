import Link from "next/link";
import { buttonVariants } from "@/shared/presentation/components/ui/button";

type NotFoundMessageProps = {
  href: string;
  linkLabel: string;
};

/** 掲示板が存在しないのか、所属していないだけなのかは区別せずに伝える。 */
export function NotFoundMessage({ href, linkLabel }: NotFoundMessageProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="font-semibold text-xl">ページが見つかりません</h1>
      <p className="text-muted-foreground text-sm">
        URL が間違っているか、閲覧する権限がありません。
      </p>
      <Link href={href} className={buttonVariants()}>
        {linkLabel}
      </Link>
    </div>
  );
}
