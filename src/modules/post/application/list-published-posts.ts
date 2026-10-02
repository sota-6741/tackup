import {
  encodePostCursor,
  POST_PAGE_SIZE,
  parsePostCursor,
} from "@/modules/post/domain/post";
import type { PostRepository } from "@/modules/post/domain/post-repository";
import type { FileStorage } from "@/shared/domain/file-storage";

type Deps = {
  postRepository: PostRepository;
  fileStorage: FileStorage;
  now: () => Date;
};

export type ListPublishedPostsInput = {
  boardId: string;
  /** 前のページの `nextCursor`。URL から来る値なので、形が合わなければ最初のページを返す。 */
  cursor?: string;
};

/** 画面に渡す形。内部の ID とストレージのキーは含めない。 */
export type PublishedPostView = {
  publicId: string;
  title: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type PublishedPostsPage = {
  posts: PublishedPostView[];
  /** 続きがなければ `null`。 */
  nextCursor: string | null;
};

/**
 * 掲示板の公開中の掲示物を、1 ページ分返す。
 * その掲示板を見てよいかは確かめない。確かめるのは呼び出す側の use case（メンバー向け・招待リンク向け）で、画面からは直接呼ばせない。
 */
export function makeListPublishedPosts({
  postRepository,
  fileStorage,
  now,
}: Deps) {
  return async function listPublishedPosts({
    boardId,
    cursor,
  }: ListPublishedPostsInput): Promise<PublishedPostsPage> {
    // 続きがあるかを知るために、1 件多く取る。
    const found = await postRepository.findPublished({
      boardId,
      now: now(),
      limit: POST_PAGE_SIZE + 1,
      after: (cursor && parsePostCursor(cursor)) || undefined,
    });
    const page = found.slice(0, POST_PAGE_SIZE);
    const last = page.at(-1);

    // 署名付きの URL は 1 本ごとに通信が起きうるので、並行に発行する。
    const posts = await Promise.all(
      page.map(async (post) => ({
        publicId: post.publicId,
        title: post.title,
        thumbnailUrl: await fileStorage.createDownloadUrl(post.thumbnailKey),
        thumbnailWidth: post.thumbnailWidth,
        thumbnailHeight: post.thumbnailHeight,
      })),
    );
    return {
      posts,
      nextCursor:
        found.length > POST_PAGE_SIZE && last
          ? encodePostCursor({ publishFrom: last.publishFrom, id: last.id })
          : null,
    };
  };
}
