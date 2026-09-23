---
paths:
  - "src/**/*.tsx"
  - "components.json"
---

# UI: Base UI 上の shadcn/ui

- UI は `base-nova` スタイルの shadcn/ui を使う。これは Radix ではなく Base UI（`@base-ui/react`）の上に作られている。コンポーネントは `bunx shadcn@latest add <name>` で追加し、`src/shared/presentation/components/ui` に生成される。
- Base UI は要素の合成に Radix の `asChild` ではなく `render` prop を使う（例: `<SidebarMenuButton render={<Link href="/boards/new" />}>`）。ネット上の shadcn/ui の例の多くは Radix 向けなので、UI のコードを書く前に `node_modules/@base-ui/react/docs/` を読む。
- `Button` の `render` prop でリンクを描画しない（Base UI はボタンの意味を強制する）。代わりにリンクにスタイルを当てる: `<Link href="/boards" className={buttonVariants()}>`。
- クラス名は `@/shared/presentation/lib/utils` の `cn` で結合する。
- `components/ui` は汎用のままにする。機能固有の UI（サイドバー・フォーム）は `src/modules/<feature>/presentation` に置き、`ui` のコンポーネントを組み合わせて作る。
- `src/shared/presentation/components/ui/**` は shadcn が生成するもので、Biome の linter の対象外（`biome.json` の `overrides`）。formatter はかかる。lint を通すために手で直さない（`shadcn add` をやり直すと上書きされる）。
