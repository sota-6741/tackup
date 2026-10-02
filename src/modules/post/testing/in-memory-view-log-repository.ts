import type { ViewLogRepository } from "@/modules/post/domain/view-log-repository";

export function makeInMemoryViewLogRepository() {
  const viewedPostIds: string[] = [];

  const repository: ViewLogRepository = {
    async record(postId) {
      viewedPostIds.push(postId);
    },
  };

  return { repository, viewedPostIds };
}
