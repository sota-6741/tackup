import type { RateLimited } from "@/shared/domain/rate-limiter";

/** Server Action の戻り値。失敗の理由は Server Action で文言に変えて渡す。 */
export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** Server Action が文言に変える失敗の理由。use case の理由・回数の制限・入力の形の誤り（`invalid_input`）。 */
export type ActionFailureReason<R> =
  | Extract<R | RateLimited, { ok: false; reason: string }>["reason"]
  | "invalid_input";
