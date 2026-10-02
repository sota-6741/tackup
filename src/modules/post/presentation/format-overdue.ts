const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 掲示終了を過ぎてからの時間。どれが古いかが分かればよいので、いちばん大きい単位だけで出す。 */
export function formatOverdue({
  expiresAt,
  now,
}: {
  expiresAt: Date;
  now: Date;
}): string {
  const elapsed = now.getTime() - expiresAt.getTime();
  if (elapsed >= DAY) return `${Math.floor(elapsed / DAY)}日超過`;
  if (elapsed >= HOUR) return `${Math.floor(elapsed / HOUR)}時間超過`;
  if (elapsed >= MINUTE) return `${Math.floor(elapsed / MINUTE)}分超過`;
  return "1分未満の超過";
}
