import type { ViewLogRepository } from "@/modules/post/domain/view-log-repository";

type Deps = {
  viewLogRepository: ViewLogRepository;
};

/**
 * 掲示物詳細が開かれたことを記録する。`postId` は、`getPostDetail` が見てよいと確かめて返したものを渡す。
 * 記録の失敗で表示を止めないよう、呼び出し側は応答を返したあとに呼ぶ。
 */
export function makeRecordPostView({ viewLogRepository }: Deps) {
  return async function recordPostView({
    postId,
  }: {
    postId: string;
  }): Promise<void> {
    await viewLogRepository.record(postId);
  };
}
