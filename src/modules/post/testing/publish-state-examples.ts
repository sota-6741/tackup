import type { Post } from "@/modules/post/domain/post";

export const NOW = new Date("2026-10-15T00:00:00Z");

type Example = Pick<Post, "status" | "publishFrom" | "expiresAt"> & {
  name: string;
  published: boolean;
  expired: boolean;
};

const past = new Date("2026-10-01T00:00:00Z");
const future = new Date("2026-11-01T00:00:00Z");

/**
 * 公開状態の判定の例。domain の関数（`isPublished`・`isExpired`）と、Repository の SQL の条件の両方を、同じ例で確かめる。
 * 2 つが食い違うと、画面ごとに見える掲示物が変わってしまう。
 */
export const PUBLISH_STATE_EXAMPLES: Example[] = [
  {
    name: "掲示期間の中",
    status: "published",
    publishFrom: past,
    expiresAt: future,
    published: true,
    expired: false,
  },
  {
    name: "無期限で、掲示開始を過ぎている",
    status: "published",
    publishFrom: past,
    expiresAt: null,
    published: true,
    expired: false,
  },
  {
    name: "掲示開始がちょうど今",
    status: "published",
    publishFrom: NOW,
    expiresAt: future,
    published: true,
    expired: false,
  },
  {
    name: "掲示開始前",
    status: "published",
    publishFrom: future,
    expiresAt: new Date("2026-12-01T00:00:00Z"),
    published: false,
    expired: false,
  },
  {
    name: "無期限で、掲示開始前",
    status: "published",
    publishFrom: future,
    expiresAt: null,
    published: false,
    expired: false,
  },
  {
    name: "掲示終了がちょうど今",
    status: "published",
    publishFrom: past,
    expiresAt: NOW,
    published: false,
    expired: true,
  },
  {
    name: "掲示終了を過ぎている",
    status: "published",
    publishFrom: past,
    expiresAt: new Date("2026-10-10T00:00:00Z"),
    published: false,
    expired: true,
  },
  {
    name: "撤去済み",
    status: "removed",
    publishFrom: past,
    expiresAt: new Date("2026-10-10T00:00:00Z"),
    published: false,
    expired: false,
  },
  {
    name: "無期限で、撤去済み",
    status: "removed",
    publishFrom: past,
    expiresAt: null,
    published: false,
    expired: false,
  },
  {
    name: "下書き",
    status: "draft",
    publishFrom: past,
    expiresAt: future,
    published: false,
    expired: false,
  },
];
