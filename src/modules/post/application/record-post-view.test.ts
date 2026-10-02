import { expect, test } from "vitest";
import { makeInMemoryViewLogRepository } from "@/modules/post/testing/in-memory-view-log-repository";
import { makeRecordPostView } from "./record-post-view";

test("掲示物の閲覧を 1 件記録する", async () => {
  const { repository, viewedPostIds } = makeInMemoryViewLogRepository();
  const recordPostView = makeRecordPostView({ viewLogRepository: repository });

  await recordPostView({ postId: "post-1" });

  expect(viewedPostIds).toEqual(["post-1"]);
});
