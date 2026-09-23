<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Commands

- Before finishing a change, run `bun run check` (typecheck, lint, unit tests). Also run `bun run test:db` (or `bun run check:all`) when infrastructure or the database changed. Start PostgreSQL with `bun run db:up`.

# Product docs

- Read `docs/requirements.md` before implementing a feature, and `docs/screens.md` for screen specs. They are the source of truth; update them when a decision changes.

# Architecture: Onion (feature modules × layers)

```
src/app/                          routing only; calls presentation or di
src/di/                           composition root; wires infrastructure into use cases
src/modules/<feature>/domain/     entities, value objects, repository interfaces (no packages)
src/modules/<feature>/application/ use cases as `makeXxx(deps)` factories (no packages)
src/modules/<feature>/infrastructure/ Drizzle tables (`schema.ts`) and repository implementations
src/modules/<feature>/presentation/ Server Actions and components
src/shared/{domain,infrastructure,presentation}/ cross-feature code (shadcn/ui lives in shared/presentation)
```

- Dependencies point inward only. `bun run lint` enforces this with dependency-cruiser (`.dependency-cruiser.cjs`).
- presentation never imports infrastructure; it gets use cases from `@/di/*`.
- Read `@/env` only in infrastructure.

# Detailed rules

Detailed rules live in `.claude/rules/` (in Japanese). Claude Code loads each file automatically when working on the files its `paths` lists; other agents should read the relevant file before changing those areas.

- `error-handling.md`: `null` / typed result / `throw`, and which layer handles what. Code that still throws `DomainError` for expected failures predates this rule; do not add new ones.
- `testing.md`: in-memory repositories, `*.db.test.ts`
- `database.md`: Drizzle tables, `withSafeDatabaseErrors`
- `ui.md`: shadcn/ui on Base UI
- `code-style.md`: JSDoc, object parameters
- `pull-requests.md`: branches, reviews, PR titles
