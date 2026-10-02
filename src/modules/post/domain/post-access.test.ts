import { expect, test } from "vitest";
import {
  NOW,
  PUBLISH_STATE_EXAMPLES,
} from "@/modules/post/testing/publish-state-examples";
import {
  decidePostAccess,
  originalFileName,
  postDisplayState,
} from "./post-access";

const published = {
  status: "published" as const,
  publishFrom: new Date("2026-10-01T00:00:00Z"),
  expiresAt: new Date("2026-11-01T00:00:00Z"),
};
const expired = { ...published, expiresAt: new Date("2026-10-10T00:00:00Z") };

const everyone = [
  { who: "メンバー", isMember: true, isSignedIn: true },
  { who: "メンバーでないログイン中の人", isMember: false, isSignedIn: true },
  { who: "ログインしていない人", isMember: false, isSignedIn: false },
];

test.each(everyone)(
  "公開掲示板の公開中の掲示物は、$who が見られる",
  ({ isMember, isSignedIn }) => {
    const access = decidePostAccess({
      post: published,
      board: { isPublic: true },
      isMember,
      isSignedIn,
      now: NOW,
    });

    expect(access).toBe("allowed");
  },
);

test.each(PUBLISH_STATE_EXAMPLES.filter((example) => !example.published))(
  "公開掲示板でも、公開中でない掲示物（$name）はメンバーだけが見られる",
  (post) => {
    const board = { isPublic: true };
    const decide = (viewer: { isMember: boolean; isSignedIn: boolean }) =>
      decidePostAccess({ post, board, ...viewer, now: NOW });

    expect(decide({ isMember: true, isSignedIn: true })).toBe("allowed");
    expect(decide({ isMember: false, isSignedIn: true })).toBe("not_found");
    expect(decide({ isMember: false, isSignedIn: false })).toBe("not_found");
  },
);

test.each([
  ["公開中", published],
  ["期限切れ", expired],
])("非公開の掲示板の%sの掲示物は、メンバーだけが見られる", (_, post) => {
  const board = { isPublic: false };
  const decide = (viewer: { isMember: boolean; isSignedIn: boolean }) =>
    decidePostAccess({ post, board, ...viewer, now: NOW });

  expect(decide({ isMember: true, isSignedIn: true })).toBe("allowed");
  expect(decide({ isMember: false, isSignedIn: true })).toBe("not_found");
  // ログインすればメンバーかもしれないので、ログインを求める。
  expect(decide({ isMember: false, isSignedIn: false })).toBe(
    "sign_in_required",
  );
});

test.each([
  ["掲示期間の中", "published"],
  ["無期限で、掲示開始を過ぎている", "published"],
  ["掲示開始前", "upcoming"],
  ["無期限で、掲示開始前", "upcoming"],
  ["掲示終了を過ぎている", "expired"],
  ["掲示終了がちょうど今", "expired"],
  ["撤去済み", "removed"],
  ["無期限で、撤去済み", "removed"],
  ["下書き", "draft"],
])("%s の掲示物の表示上の状態は %s", (name, state) => {
  const example = PUBLISH_STATE_EXAMPLES.find((item) => item.name === name);
  if (!example) throw new Error(`例がない: ${name}`);

  expect(postDisplayState(example, NOW)).toBe(state);
});

test.each([
  ["application/pdf", "夏祭りのお知らせ.pdf"],
  ["image/jpeg", "夏祭りのお知らせ.jpg"],
  ["image/png", "夏祭りのお知らせ.png"],
  ["image/webp", "夏祭りのお知らせ.webp"],
] as const)(
  "%s の原本は、タイトルに拡張子を付けた名前で保存する",
  (type, name) => {
    expect(
      originalFileName({
        title: "夏祭りのお知らせ",
        originalContentType: type,
      }),
    ).toBe(name);
  },
);

test("ファイル名に使えない文字は _ に置き換える", () => {
  const name = originalFileName({
    title: '10/1 の "予定": a\\b\n改行',
    originalContentType: "application/pdf",
  });

  expect(name).toBe("10_1 の _予定__ a_b_改行.pdf");
});
