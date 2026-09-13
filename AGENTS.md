<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
- Throw `DomainError` subclasses for expected failures; Server Actions turn them into `{ error }` state.
- Test domain and application with the in-memory repository in `modules/<feature>/testing/`.
- Table files (`infrastructure/schema.ts`) are loaded by drizzle-kit: use relative imports there, not `@/`.
