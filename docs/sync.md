# Google / Firestore sync

Optional cloud sync. `localStorage` stays the source of truth; sync is `disabled` when the `VITE_FIREBASE_*` / `VITE_GOOGLE_CLIENT_ID` env vars are missing (`src/lib/firebase/config.ts`).

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

## Gotchas

- Vite inlines `import.meta.env` as an object literal; `() => import.meta.env` (expression body) breaks `npm run build` while tests still pass. Use a block body.
