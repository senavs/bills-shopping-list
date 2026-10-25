# CLAUDE.md

BillBuddy: an offline-first PWA for tracking expenses while shopping, at a restaurant or at a bar. React 18 + TypeScript + Vite + Tailwind, hash routing, deployed to GitHub Pages. No backend: data lives in `localStorage`; Google sign-in with Firestore sync is optional.

## Commands

```bash
npm run dev                         # dev server
npx vitest run                      # all unit tests, once (`npm test` starts watch mode and never exits)
npx vitest run src/lib/sync/merge.test.ts  # a single file
npx tsc --noEmit                    # typecheck (there is no linter)
npm run build                       # tsc + vite build
npm run test:rules                  # Firestore rules tests; needs Firebase CLI + Java, excluded from vitest run
npm run deploy                      # build + publish to GitHub Pages
```

Before calling work done, run `npx tsc --noEmit` and `npx vitest run`.

## Code layout

- `src/components/<Feature>/` — one folder per feature, test file next to the component (`Foo.test.tsx`). Reusable UI is in `src/components/shared/`.
- `src/contexts/` — global state. `ListsContext` owns all list/item/section mutations; components never write `localStorage` directly.
- `src/lib/` — pure logic (calculations, storage, import/export, unit types, sync). Prefer putting logic here so it is unit-testable.
- `src/i18n/` — `en.ts` and `ptBR.ts`.
- `src/types/index.ts` — data model (`AppState`, `List`, `Item`, `Section`, `Person`).
- Routes (`src/App.tsx`): `/` landing (returning visitors on a fresh tab are redirected to `/app`), `/app` dashboard, `/lists/new`, `/lists/:id`, `/lists/:id/edit`.
- Specs and plans: `sdd/`, `docs/superpowers/`.

## Rules

- **IMPORTANT: every user-facing string goes through `useLanguage().t`**, with the key added to both `src/i18n/en.ts` and `src/i18n/ptBR.ts`. `ptBR` is typed from `en`, so a missing key fails `tsc`.
- Support dark mode on every new UI (`dark:` Tailwind variants).
- Generate ids with `crypto.randomUUID()`.
- New `List`/`Item` fields must be optional and stay backward compatible: existing `localStorage` data, imported JSON (`validateImportData` in `src/lib/importExport.ts`) and Firestore docs have no migrations.
- Write tests with Vitest + Testing Library (happy-dom). Sync logic is tested with `memoryRemote` and a fake auth, never the real SDK.

## Data model notes

- Section membership lives on the section (`Section.itemIds`, ordered), not on the item. Deleting an item must also remove it from its section; deleting a section keeps its items (they fall back to "Other items").
- `duplicateList` gives items new ids and remaps `Section.itemIds`; `Person` ids are copied as-is, so `Item.assignedTo` stays valid. Any new field that references item ids must be remapped there too.
- Every `ListsContext` mutation stamps `List.updatedAt` (drives sync conflict resolution). `replaceLists` deliberately does not.
- `localStorage` keys: `app` (state), `sync-meta`, `shared-sync-meta`, `shared-name`, `theme`, `locale`, `billbuddy_visited`.
- `List.shared` marks a shared list (synced via `sharedLists/{id}`, see `docs/sync.md`). Copies, templates, exports and imports of a shared list are private (no `shared`).

## Sync

Read `docs/sync.md` before touching `src/lib/sync/`, `src/lib/sharedSync/`, `src/lib/firebase/`, `SyncContext`, `SharedSyncContext`, `src/components/Sync/`, `firestore.rules` or the OAuth code in `main.tsx`. Key constraints: the Firebase SDK must stay lazy-loaded (`import()`), and sign-in is a full-page redirect, not a popup (popups break the iOS PWA).

## Git

- Branches: `<type>/<kebab-case>` (`feat/`, `fix/`, `docs/`, `chore/`, …).
- Commits: Conventional Commits with scope when useful, e.g. `feat(sync): …`, `fix(ui): …`.
- **Do not add `Co-Authored-By: Claude` trailers or "Generated with" footers**; hooks reject them.

## Gotchas

- `.env*` files are off limits to the agent (permission rules). Env vars are documented in `README.md`.
- Worktrees live in `.claude/worktrees/`; `vitest.config.ts` excludes them so tests don't run twice or load two React copies. Keep that exclude.
- `npm run build` loads `crypto-polyfill.cjs`; don't replace it with a bare `vite build`.
- Ads (`src/components/ads/`) are disabled by `ADS_ENABLED` in `adsConfig.ts`; see `MONETIZATION.md`.
