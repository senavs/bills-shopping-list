# Google / Firestore sync

Optional cloud sync. `localStorage` stays the source of truth; sync is `disabled` when the `VITE_FIREBASE_*` / `VITE_GOOGLE_CLIENT_ID` env vars are missing (`src/lib/firebase/config.ts`); the header cloud icon then turns red and the account sheet explains it. `npm run deploy` refuses to run without them (`scripts/check-deploy-env.js`).

## Layout

- `src/lib/sync/` — pure logic, no SDK: types, hash, merge, syncMeta, errors, oauthRedirect, formatSyncedAgo, `memoryRemote` (in-memory fake for tests).
- `src/lib/firebase/` — SDK adapters: config, client, remoteDoc (doc ↔ List mapping), firestoreRemote, googleAuth, loadBackend (lazy `import()`).
- `src/contexts/SyncContext.tsx` — orchestration.
- `src/components/Sync/` — `SyncStatusButton`, `AccountSheet`, `SyncBanner`.

## How it works

- **Change detection:** each list is hashed and compared with `sync-meta` (a `localStorage` key). This also catches imports, which write storage directly and bypass `ListsContext`.
- **Pull** is incremental by server `syncedAt`. **Push** is debounced 2 s and flushed on `visibilitychange` / `pagehide`.
- **Conflicts** are resolved per list: last `updatedAt` wins. Deletions are tombstones (`deleted: true`), never hard deletes.
- `ListsContext` stamps `updatedAt` on every mutation; `replaceLists` applies remote state **without** stamping (stamping would make every pull look like a local edit).
- The Firebase SDK is loaded via `import()` only for signed-in users, on sign-in, or when returning from Google (`prepare()` preloads it). Keep it out of the main bundle.
- No name, photo or e-mail is ever read or shown.

## Firestore

- `users/{uid}/lists/{listId}` = `{ ...List, updatedAt, deleted: false, syncedAt }`, or tombstone `{ id, updatedAt, deleted: true, syncedAt }`.
- Rules: `firestore.rules`, tested by `npm run test:rules`. Firestore starts deny-all, so rule changes only take effect after `firebase deploy --only firestore:rules --project prod-billbuddy`. Symptom of undeployed rules: "Falha ao sincronizar" right after sign-in.

## Sign-in (full-page redirect, not popup)

- `signInWithPopup` never returns to an installed iOS PWA, so sign-in is a full-page OAuth implicit redirect (`src/lib/sync/oauthRedirect.ts`).
- `main.tsx` calls `consumeOAuthRedirect()` **before render** to strip `#access_token=…` (state-checked) before `HashRouter` reads the hash; `googleAuth.ts` exchanges the token via `signInWithCredential`.
- Google matches redirect URIs exactly: the registered URI is `https://senavs.github.io/bills-shopping-list/` **with** the trailing slash.

## Shared lists

A list with `List.shared` (`{ ownerUid, inviteToken, memberPeople }`) is synced by `SharedSyncContext` through `sharedLists/{id}`, never by the personal sync (`SyncContext` filters it out and `withSharedPreserved` keeps it in place). Design: `docs/superpowers/specs/2026-10-25-shared-lists-design.md`.

- **Layout:** pure logic in `src/lib/sharedSync/` (`convert`, `positions`, `diff`, `merge`, `sharedMeta`, `remoteDocs`, `invite`, `status`, `memorySharedRemote` fake); Firestore adapter in `src/lib/firebase/sharedRemote.ts`, loaded with the rest of the backend (`SyncBackend.shared`).
- **Remote shape:** the parent doc holds `name/type/currency/taxPercentage`, `members`, and maps `people`, `sections`, `memberPeople` written by field path (`people.<id>`), so concurrent edits to different entries don't collide. Each item is its own doc in `items/` carrying `sectionId` + a fractional `position`; `convert.ts` rebuilds `Section.itemIds` and item order. Item deletions are tombstones.
- **Sync:** `shared-sync-meta` stores a hash (and position) per field, person, section and item. `diffLocal` writes only what changed; after a push only the pushed entries are marked synced (edits made meanwhile stay dirty). `mergeSnapshot` applies a snapshot per entity: clean local → remote wins, dirty local → kept and pushed again. `archived` and section `collapsed` are local only.
- **Listeners:** `onSnapshot` on `sharedLists where members array-contains uid`, plus `items/` of every non-archived list. A snapshot with `fromCache: true` never removes local lists; only a server snapshot without the list (or `deleted: true`) does, with a notice.
- **Joining:** `#/join/{id}?t={token}`. The join is a batch writing `joins/{uid} = { token }` and `members: arrayUnion(uid)`; the rule checks the token with `getAfter()`. Never store the token on the parent doc: `request.resource.data` is the whole doc, so a leftover token would let anyone join.
- **Leave / delete** are queued in `pendingOps` (sent when online and signed in as the same uid). Members leave; only the owner tombstones the list. A shared list that vanishes locally without one of these actions never causes a remote write.
- **Rules:** see `firestore.rules` (`npm run test:rules`); deploy them before shipping the app: `firebase deploy --only firestore:rules --project prod-billbuddy`.

## Gotchas

- Vite inlines `import.meta.env` as an object literal; `() => import.meta.env` (expression body) breaks `npm run build` while tests still pass. Use a block body.
