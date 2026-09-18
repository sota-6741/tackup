"use client";

import { useEffect } from "react";
import { LAST_BOARD_COOKIE } from "./last-board-cookie";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * 表示中の掲示板を Cookie に記録する。何も表示しない。
 * Cookie Store API は安全な接続（HTTPS か localhost）でしか使えないので、使えないときは記録しない。記録は次にログインしたときの移動先を決めるためだけなので、失敗しても無視する。
 */
export function RememberLastBoard({ boardId }: { boardId: string }) {
  useEffect(() => {
    if (!("cookieStore" in window)) return;
    cookieStore
      .set({
        name: LAST_BOARD_COOKIE,
        value: boardId,
        path: "/",
        expires: Date.now() + ONE_YEAR_MS,
        sameSite: "lax",
      })
      .catch(() => {});
  }, [boardId]);

  return null;
}
