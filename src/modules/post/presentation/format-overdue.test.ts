import { expect, test } from "vitest";
import { formatOverdue } from "./format-overdue";

const expiresAt = new Date("2026-10-01T00:00:00Z");

test.each([
  ["2026-10-01T00:00:00Z", "1分未満の超過"],
  ["2026-10-01T00:00:59Z", "1分未満の超過"],
  ["2026-10-01T00:01:00Z", "1分超過"],
  ["2026-10-01T00:59:59Z", "59分超過"],
  ["2026-10-01T01:00:00Z", "1時間超過"],
  ["2026-10-01T23:59:59Z", "23時間超過"],
  ["2026-10-02T00:00:00Z", "1日超過"],
  ["2026-10-31T12:00:00Z", "30日超過"],
])("%s の時点では「%s」と表示する", (now, text) => {
  expect(formatOverdue({ expiresAt, now: new Date(now) })).toBe(text);
});
