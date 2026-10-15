# Sincronização com Google via Firebase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login opcional com Google que sincroniza as listas do `localStorage` com o Firestore (plano Spark), mantendo o app offline-first.

**Architecture:** `localStorage` continua a fonte de verdade. Uma camada `SyncContext` (só ativa com login) detecta mudanças por hash contra a última versão sincronizada, puxa da nuvem incrementalmente (`syncedAt` do servidor como cursor) e envia listas sujas/tombstones; conflitos por lista com "última edição vence" (`updatedAt`). O SDK do Firebase é carregado sob demanda via `import()`.

**Tech Stack:** React 18, TypeScript, Vite 4, Vitest 1 + Testing Library + fast-check, `firebase@12.19.0` (Auth + Firestore), `@firebase/rules-unit-testing@5.0.2` + Firebase CLI (emulator).

**Spec:** `docs/superpowers/specs/2026-10-15-google-sync-design.md`

## Global Constraints

- Nenhuma config do Firebase em arquivo versionado: valores só em `.env.local` (coberto por `*.local` no `.gitignore`); `.env.example` versionado com valores vazios.
- Variáveis: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (e `VITE_GOOGLE_CLIENT_ID` somente se o spike escolher a opção B).
- Build sem variáveis deve funcionar: status `disabled`, nenhuma UI de login.
- O app nunca lê/grava `displayName`, `photoURL` ou `email`; no Firestore só existem `users/{uid}/lists/{listId}`.
- Firestore: caminho `users/{uid}/lists/{listId}`; doc ativo `{ ...List, updatedAt, deleted: false, syncedAt: serverTimestamp() }`; tombstone `{ id, updatedAt, deleted: true, syncedAt }`.
- Chaves `localStorage`: `app` (existente), `sync-meta` (nova), `sync-banner-dismissed` (nova).
- Debounce de push: 2000 ms. Timeout de rede: 15000 ms.
- O SDK `firebase` só pode ser importado dentro de `src/lib/firebase/client.ts`, `googleAuth.ts`, `firestoreRemote.ts` (e o spike descartável). Nada em `src/` importa esses arquivos estaticamente, exceto `loadBackend.ts` via `import()`.
- `npm test` nunca acessa rede nem o SDK real; testes de regras rodam só em `npm run test:rules`.
- Textos novos sempre em `src/i18n/en.ts` **e** `src/i18n/ptBR.ts`.
- **Não commitar** `docs/superpowers/**` (pedido do dono). Use `git add` com caminhos explícitos em todo commit.
- Fixar versões: `firebase@12.19.0`, `@firebase/rules-unit-testing@5.0.2` (majors 13/6 têm < 2 semanas).

## Review Focus

1. **Popup bloqueado no iOS** porque `signIn()` faz `await import(...)` antes de abrir o popup (perde o gesto do usuário) → esperado: com backend pré-carregado (`prepare()`), `auth.signIn` é chamado de forma síncrona no toque. Teste na Task 6.
2. **Loop infinito de push** porque o round-trip pelo Firestore remove campos `undefined`/reordena chaves e muda o hash → esperado: hash idêntico após round-trip JSON e após `toRemoteDoc`. Testes nas Tasks 3 e 5.
3. **Status preso em "Sincronizando…" offline** porque `batch.commit()` não resolve sem rede → esperado: timeout vira status `offline`. Teste na Task 6.
4. **Logout no meio de um ciclo** regrava `sync-meta` depois de limpo → esperado: `sync-meta` continua ausente. Teste na Task 6.
5. **Edição feita durante um ciclo em andamento** é perdida ou não enviada → esperado: conteúdo editado permanece e é enviado no ciclo seguinte. Teste na Task 6.

---

## Passo 0 (manual, dono do projeto): criar e configurar o Firebase

> Feito uma única vez, no navegador, com a sua conta Google. Nada aqui gera arquivo versionado.

- [ ] **0.1 Criar o projeto**
  1. Acesse https://console.firebase.google.com → **Criar projeto** (ou "Add project").
  2. Nome: `billbuddy` (anote o **Project ID** gerado, ex.: `billbuddy-1a2b3`).
  3. **Desative o Google Analytics** na etapa seguinte (minimizar dados).
  4. Ao final, confirme em ⚙️ **Usage and billing** que o plano é **Spark** e que nenhuma conta de faturamento está vinculada.

- [ ] **0.2 Registrar o app web**
  1. ⚙️ **Project settings → General → Your apps → Web (`</>`)**.
  2. Apelido: `BillBuddy web`. **Não** marque Firebase Hosting.
  3. Copie do bloco `firebaseConfig` os valores `apiKey`, `authDomain`, `projectId`, `appId` (os demais não são usados).

- [ ] **0.3 Habilitar login com Google**
  1. **Build → Authentication → Get started → Sign-in method → Google → Enable**.
  2. "Public-facing name": `BillBuddy`. "Support email": um e-mail seu (aparece na tela de consentimento do Google).
  3. Salvar.

- [ ] **0.4 Domínios autorizados**
  1. **Authentication → Settings → Authorized domains**.
  2. Mantenha `localhost` e `<projectId>.firebaseapp.com`.
  3. **Adicione** `senavs.github.io`.
  4. Remova `<projectId>.web.app` (não usamos Hosting).

- [ ] **0.5 Tela de consentimento OAuth**
  1. Abra https://console.cloud.google.com → selecione o projeto → **Google Auth Platform** (ou "APIs & Services → OAuth consent screen").
  2. **Branding:** nome `BillBuddy`, e-mail de suporte; domínio do app: `https://senavs.github.io/bills-shopping-list/` (opcional).
  3. **Audience:** tipo **External**; status de publicação **In production** (os escopos básicos `openid/email/profile` não exigem verificação).
  4. **Data access:** não adicione escopos.

- [ ] **0.6 Criar o Firestore**
  1. **Build → Firestore Database → Create database**.
  2. Edição **Standard**; local **`southamerica-east1 (São Paulo)`** (não pode ser alterado depois).
  3. Modo **production** (tudo negado até publicarmos as regras na Task 5).

- [ ] **0.7 Restringir a API key**
  1. Google Cloud console → **APIs & Services → Credentials → API keys → "Browser key (auto created by Firebase)"**.
  2. **Application restrictions → Websites**, adicione:
     - `https://senavs.github.io/*`
     - `https://<projectId>.firebaseapp.com/*`
     - `http://localhost:5173/*`
     - `http://localhost:4173/*`
  3. **API restrictions → Restrict key**, marque: **Identity Toolkit API**, **Token Service API**, **Cloud Firestore API**.
  4. Salvar. (Se algo quebrar no spike com erro `auth/requests-from-referer-...-are-blocked` ou `API_KEY_HTTP_REFERRER_BLOCKED`, revise esta lista.)

- [ ] **0.8 Ferramentas locais**
  ```bash
  npm install -g firebase-tools
  firebase login
  java -version   # precisa de Java 11+ para o emulator; instale (ex.: sudo apt install openjdk-17-jre-headless) se faltar
  ```

- [ ] **0.9 Criar `.env.local`** na raiz do repositório **e** na raiz do worktree em uso (cada checkout precisa da sua cópia):
  ```bash
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=<projectId>.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=<projectId>
  VITE_FIREBASE_APP_ID=...
  ```
  Verifique que está ignorado:
  ```bash
  git check-ignore -v .env.local   # Expected: .gitignore:NN:*.local	.env.local
  git status --short               # Expected: .env.local NÃO aparece
  ```

- [ ] **0.10 (somente se o spike escolher a opção B)** Client ID do OAuth
  1. Google Cloud → **Credentials → OAuth 2.0 Client IDs → "Web client (auto created by Google Service)"**.
  2. **Authorized JavaScript origins:** adicione `https://senavs.github.io` e `http://localhost:5173`.
  3. Copie o Client ID para `.env.local` como `VITE_GOOGLE_CLIENT_ID=...`.

---

### Task 1: Spike descartável — login Google no PWA standalone do iOS

Objetivo: decidir entre **A** (`signInWithPopup`) e **B** (Google Identity Services token client → `signInWithCredential`). Nada desta task é commitado, exceto a instalação do pacote `firebase`.

**Files:**
- Modify: `package.json`, `package-lock.json` (commit)
- Create (descartável): `spike-auth.html`, `src/spike/auth.ts`
- Modify (descartável): `vite.config.ts`

**Interfaces:**
- Consumes: Passo 0 concluído, `.env.local` presente.
- Produces: decisão **A** ou **B**, registrada no spec (seção 5) e usada na Task 5 Step 7.

- [ ] **Step 1: Instalar o SDK fixado**

```bash
npm install firebase@12.19.0 --save-exact
```

- [ ] **Step 2: Commit da dependência**

```bash
git add package.json package-lock.json
git commit -m "build: add firebase sdk 12.19.0"
```

- [ ] **Step 3: Criar a página do spike** `spike-auth.html` (raiz):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>Auth spike</title>
    <style>button{display:block;width:100%;margin:8px 0;padding:14px;font-size:16px}pre{white-space:pre-wrap;font-size:12px}</style>
  </head>
  <body>
    <button id="popup">A: signInWithPopup</button>
    <button id="gis">B: GIS token client</button>
    <button id="out">Sign out</button>
    <pre id="log"></pre>
    <script type="module" src="/src/spike/auth.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Criar `src/spike/auth.ts`**

```ts
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth'

const logEl = document.getElementById('log')!
const log = (m: string) => { logEl.textContent += `${new Date().toISOString().slice(11, 19)} ${m}\n` }

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)

const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
log(`standalone=${standalone}`)
onAuthStateChanged(auth, u => log(`auth state: ${u ? `uid ${u.uid.slice(0, 6)}…` : 'signed out'}`))

document.getElementById('popup')!.onclick = () => {
  signInWithPopup(auth, new GoogleAuthProvider()).then(() => log('A ok'), e => log(`A fail ${e.code}`))
}

const gis = document.createElement('script')
gis.src = 'https://accounts.google.com/gsi/client'
document.head.appendChild(gis)

document.getElementById('gis')!.onclick = () => {
  const google = (window as unknown as { google: any }).google
  const client = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'openid email',
    callback: (r: { error?: string; access_token: string }) => {
      if (r.error) return log(`B fail ${r.error}`)
      signInWithCredential(auth, GoogleAuthProvider.credential(null, r.access_token)).then(() => log('B ok'), e => log(`B fail ${e.code}`))
    },
    error_callback: (e: { type: string }) => log(`B fail ${e.type}`),
  })
  client.requestAccessToken()
}

document.getElementById('out')!.onclick = () => { signOut(auth).then(() => log('signed out')) }
```

- [ ] **Step 5: Incluir o spike no build** — em `vite.config.ts`, adicione no objeto de `defineConfig`:

```ts
  build: {
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        spike: new URL('./spike-auth.html', import.meta.url).pathname,
      },
    },
  },
```

- [ ] **Step 6: Publicar temporariamente** (o próximo deploy remove o spike; o app em si não muda)

```bash
npm run deploy
```
Expected: `Published`. Para testar a opção B, faça antes o Passo 0.10.

- [ ] **Step 7: Testar no iPhone** e anotar o log de cada linha:

| # | Contexto | A | B |
|---|---|---|---|
| 1 | Safari (aba normal) em `https://senavs.github.io/bills-shopping-list/spike-auth.html` | | |
| 2 | Compartilhar → **Adicionar à Tela de Início** → abrir pelo ícone (`standalone=true` no log) | | |
| 3 | No standalone, após login: fechar o app (swipe up) e reabrir → log mostra `auth state: uid …`? | | |

- [ ] **Step 8: Decidir**
  - A funcionou em #2 e #3 → **opção A** (padrão da Task 5).
  - Só B funcionou → **opção B** (Task 5 Step 7 alternativo; exige `VITE_GOOGLE_CLIENT_ID`).
  - Nenhuma funcionou → **parar** e revisar com o dono (alternativa: hospedar o helper `/__/auth/` no domínio raiz `senavs.github.io`, ver "redirect best practices" do Firebase).
  - Registre a decisão e a tabela na seção 5 do spec.

- [ ] **Step 9: Descartar o spike**

```bash
git checkout -- vite.config.ts
rm -rf spike-auth.html src/spike
git status --short   # Expected: limpo (exceto docs/ não commitados)
```

---

### Task 2: `updatedAt` nas listas, `replaceLists` e carimbo no import

**Files:**
- Modify: `src/types/index.ts` (interface `List`)
- Modify: `src/contexts/ListsContext.tsx`
- Modify: `src/lib/importExport.ts:39-104`
- Modify: `src/components/Dashboard/Dashboard.test.tsx`, `src/components/ListForm/ListForm.test.tsx` (mocks de `useLists`)
- Test: `src/contexts/ListsContext.test.tsx`, `src/lib/importExport.test.ts`

**Interfaces:**
- Produces: `List.updatedAt?: number`; `useLists().replaceLists(lists: List[]): void` (não carimba); `normalizeImportedState(state: AppState, now?: number): AppState` (carimba `updatedAt = now`).

- [ ] **Step 1: Testes que falham** — acrescente ao final de `src/contexts/ListsContext.test.tsx` (adicione `vi, afterEach` ao import de `vitest`):

```ts
describe('updatedAt stamping', () => {
  afterEach(() => vi.restoreAllMocks())

  it('stamps updatedAt when an item changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000)
    const getCtx = setup()
    act(() => getCtx().updateItem(LIST_ID, 'a', { name: 'Apricot' }))
    expect(getList(getCtx()).updatedAt).toBe(5_000)
  })

  it('stamps updatedAt on create, duplicate and archive', () => {
    vi.spyOn(Date, 'now').mockReturnValue(7_000)
    const getCtx = setup()
    act(() => getCtx().createList({ name: 'New', type: 'shopping', currency: 'BRL', taxPercentage: 0 }))
    act(() => getCtx().duplicateList(LIST_ID))
    act(() => getCtx().archiveList(LIST_ID))
    expect(getCtx().lists.map(l => l.updatedAt)).toEqual([7_000, 7_000, 7_000])
  })

  it('replaceLists does not stamp updatedAt', () => {
    vi.spyOn(Date, 'now').mockReturnValue(9_000)
    const getCtx = setup()
    act(() => getCtx().replaceLists([{ ...makeList(), name: 'Remote', updatedAt: 42 }]))
    expect(getList(getCtx())).toMatchObject({ name: 'Remote', updatedAt: 42 })
  })
})
```

Acrescente a `src/lib/importExport.test.ts` (ajuste os imports para incluir `normalizeImportedState` e `validateImportData` se ainda não estiverem):

```ts
describe('import updatedAt', () => {
  const base = { id: 'l1', name: 'L', type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false }

  it('normalizeImportedState stamps updatedAt with now', () => {
    const state = normalizeImportedState({ lists: [{ ...base, updatedAt: 1 } as never] }, 123)
    expect(state.lists[0].updatedAt).toBe(123)
  })

  it('validateImportData accepts numeric updatedAt and rejects non-numeric', () => {
    expect(validateImportData({ lists: [{ ...base, updatedAt: 5 }] })).toBe(true)
    expect(validateImportData({ lists: [{ ...base, updatedAt: 'x' }] })).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/contexts/ListsContext.test.tsx src/lib/importExport.test.ts`
Expected: FAIL (`replaceLists is not a function`, `updatedAt` undefined, validação aceitando `'x'`).

- [ ] **Step 3: Tipo** — em `src/types/index.ts`, dentro de `interface List`, após `people?: Person[];`:

```ts
  updatedAt?: number;  // epoch ms of the last local edit; drives sync conflict resolution
```

- [ ] **Step 4: `ListsContext`** — em `src/contexts/ListsContext.tsx`:

Na interface `ListsContextType`, após `reorderItemInSection`:
```ts
  replaceLists: (lists: List[]) => void
```

Substitua `updateListById` e `createList` por:
```ts
  // Every local edit stamps updatedAt so sync can resolve conflicts (last edit wins)
  const touch = (l: List): List => ({ ...l, updatedAt: Date.now() })

  const updateListById = (id: string, updater: (list: List) => List) =>
    setLists(prev => prev.map(l => l.id === id ? touch(updater(l)) : l))

  const createList = (list: Omit<List, 'id' | 'items' | 'sections' | 'archived'>) => {
    setLists(prev => [...prev, touch({ ...list, id: crypto.randomUUID(), items: [], sections: [], archived: false })])
  }
```

Em `duplicateList`, troque o `setLists` por:
```ts
      setLists(prev => [...prev, touch({ ...list, id: crypto.randomUUID(), name: `${list.name} (copy)`, items, sections })])
```

Em `saveAsTemplate` e `createFromTemplate`, envolva o objeto novo com `touch(...)`:
```ts
      setLists(prev => [...prev, touch({
        ...list,
        // ...campos existentes inalterados
      })])
```
(em `createFromTemplate` o spread é `...template`).

Antes do `return (`, adicione:
```ts
  // Applies state that came from sync: keeps remote updatedAt instead of stamping
  const replaceLists = (next: List[]) => setLists(next)
```

E inclua `replaceLists` no `value` do Provider (última linha do objeto):
```ts
      addSection, updateSection, deleteSection, reorderSection, reorderItemInSection,
      replaceLists,
```

- [ ] **Step 5: Import** — em `src/lib/importExport.ts`:

Em `validateImportData`, dentro de `isValidList`, após `typeof l.archived === 'boolean'`:
```ts
      typeof l.archived === 'boolean' &&
      (l.updatedAt === undefined || typeof l.updatedAt === 'number')
```

Substitua `normalizeImportedState` por:
```ts
/**
 * Normalize imported state: ensure every item has a unitType field and stamp
 * updatedAt so an intentional import wins over older cloud copies.
 */
export const normalizeImportedState = (state: AppState, now: number = Date.now()): AppState => ({
  ...state,
  lists: state.lists.map((l: List) => ({
    ...l,
    updatedAt: now,
    items: l.items.map(item => ({
      ...item,
      unitType: item.unitType ?? 'unit',
    })),
  })),
})
```

- [ ] **Step 6: Mocks de `useLists`** — em `src/components/Dashboard/Dashboard.test.tsx` e `src/components/ListForm/ListForm.test.tsx`, adicione ao objeto `mockUseLists`, após `reorderItemInSection: vi.fn(),`:

```ts
    replaceLists: vi.fn(),
```

- [ ] **Step 7: Rodar a suíte e o typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS em tudo; `tsc` sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/contexts/ListsContext.tsx src/contexts/ListsContext.test.tsx src/lib/importExport.ts src/lib/importExport.test.ts src/components/Dashboard/Dashboard.test.tsx src/components/ListForm/ListForm.test.tsx
git commit -m "feat(sync): stamp updatedAt on list edits and imports, add replaceLists"
```

---

### Task 3: Tipos de sync, `hashList` e `sync-meta`

**Files:**
- Create: `src/lib/sync/types.ts`, `src/lib/sync/hash.ts`, `src/lib/sync/syncMeta.ts`
- Test: `src/lib/sync/hash.test.ts`, `src/lib/sync/syncMeta.test.ts`

**Interfaces:**
- Produces (usados por todas as tasks seguintes):

```ts
// src/lib/sync/types.ts
export type SyncStatus = 'disabled' | 'signedOut' | 'idle' | 'syncing' | 'offline' | 'error'
export type SyncErrorKind = 'auth' | 'quota' | 'unknown'
export interface SyncMeta { uid: string; lastPulledAt: number | null; synced: Record<string, string>; deleted: Record<string, number> }
export interface RemoteListDoc { id: string; updatedAt: number; deleted: boolean; syncedAt: number; list?: List }
export interface Tombstone { id: string; deletedAt: number }
export interface RemoteStore { pullSince(uid: string, cursor: number | null): Promise<RemoteListDoc[]>; push(uid: string, lists: List[], tombstones: Tombstone[]): Promise<void> }
export interface AuthProvider { signIn(): Promise<void>; signOut(): Promise<void>; onChange(cb: (uid: string | null) => void): () => void }
export interface MergeResult { lists: List[]; toPush: List[]; tombstones: Tombstone[]; settledDeletes: string[] }
```
- `hashList(list: List): string`
- `loadSyncMeta(): SyncMeta | null`, `saveSyncMeta(meta: SyncMeta): void`, `clearSyncMeta(): void`, `emptySyncMeta(uid: string): SyncMeta`

> Nota sobre `SyncMeta.deleted`: registra o momento real da exclusão local (`listId → epoch ms`), preenchido pelo `SyncContext` assim que uma lista sincronizada some do estado. Refina o spec (seção 3.1) para que uma exclusão antiga feita offline não vença uma edição remota mais nova.

- [ ] **Step 1: Criar `src/lib/sync/types.ts`** com exatamente o bloco de interfaces acima, precedido de:

```ts
import type { List } from '../../types'
```

- [ ] **Step 2: Testes que falham** — `src/lib/sync/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hashList } from './hash'
import type { List } from '../../types'

const list = (over: Partial<List> = {}): List => ({
  id: 'l1', name: 'Groceries', type: 'shopping', currency: 'BRL', taxPercentage: 10,
  items: [{ id: 'i1', name: 'Milk', quantity: 2, unitPrice: 5, selected: false, includeInTax: true, unitType: 'unit' }],
  sections: [{ id: 's1', name: 'Dairy', itemIds: ['i1'], collapsed: false }],
  archived: false,
  ...over,
})

describe('hashList', () => {
  it('ignores key order', () => {
    const a = list()
    const b = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(a).reverse())))
    expect(hashList(b)).toBe(hashList(a))
  })

  it('ignores updatedAt', () => {
    expect(hashList(list({ updatedAt: 1 }))).toBe(hashList(list({ updatedAt: 2 })))
  })

  it('treats undefined fields as absent (Firestore round-trip)', () => {
    const withUndefined = list({ people: undefined, isTemplate: undefined })
    const roundTripped = JSON.parse(JSON.stringify(withUndefined))
    expect(hashList(roundTripped)).toBe(hashList(withUndefined))
  })

  it('changes when content changes', () => {
    expect(hashList(list({ name: 'Other' }))).not.toBe(hashList(list()))
    const moved = list()
    moved.items[0] = { ...moved.items[0], quantity: 3 }
    expect(hashList(moved)).not.toBe(hashList(list()))
  })
})
```

`src/lib/sync/syncMeta.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadSyncMeta, saveSyncMeta, clearSyncMeta, emptySyncMeta } from './syncMeta'

beforeEach(() => localStorage.clear())

describe('syncMeta', () => {
  it('returns null when absent', () => {
    expect(loadSyncMeta()).toBeNull()
  })

  it('round-trips', () => {
    const meta = { uid: 'u1', lastPulledAt: 10, synced: { l1: 'h' }, deleted: { l2: 5 } }
    saveSyncMeta(meta)
    expect(loadSyncMeta()).toEqual(meta)
  })

  it('returns null for invalid JSON or shape', () => {
    localStorage.setItem('sync-meta', '{oops')
    expect(loadSyncMeta()).toBeNull()
    localStorage.setItem('sync-meta', JSON.stringify({ synced: {} }))
    expect(loadSyncMeta()).toBeNull()
  })

  it('fills missing optional fields', () => {
    localStorage.setItem('sync-meta', JSON.stringify({ uid: 'u1' }))
    expect(loadSyncMeta()).toEqual(emptySyncMeta('u1'))
  })

  it('clears', () => {
    saveSyncMeta(emptySyncMeta('u1'))
    clearSyncMeta()
    expect(localStorage.getItem('sync-meta')).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/lib/sync`
Expected: FAIL (módulos `./hash` e `./syncMeta` não encontrados).

- [ ] **Step 4: Implementar `src/lib/sync/hash.ts`**

```ts
import type { List } from '../../types'

// Key-sorted serialization that drops undefined, so a list hashes the same
// before and after a Firestore round-trip (which reorders keys and drops undefined)
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort()
    return `{${keys.map(k => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Content hash (FNV-1a) of a list, ignoring updatedAt. */
export const hashList = (list: List): string => {
  const content: Record<string, unknown> = { ...list }
  delete content.updatedAt
  const s = stable(content)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16)}-${s.length}`
}
```

- [ ] **Step 5: Implementar `src/lib/sync/syncMeta.ts`**

```ts
import type { SyncMeta } from './types'

const STORAGE_KEY = 'sync-meta'

export const emptySyncMeta = (uid: string): SyncMeta => ({ uid, lastPulledAt: null, synced: {}, deleted: {} })

export const loadSyncMeta = (): SyncMeta | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (!m || typeof m.uid !== 'string') return null
    return {
      uid: m.uid,
      lastPulledAt: typeof m.lastPulledAt === 'number' ? m.lastPulledAt : null,
      synced: m.synced && typeof m.synced === 'object' ? m.synced : {},
      deleted: m.deleted && typeof m.deleted === 'object' ? m.deleted : {},
    }
  } catch {
    return null
  }
}

export const saveSyncMeta = (meta: SyncMeta): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // Quota exceeded - the next successful cycle rewrites it
  }
}

export const clearSyncMeta = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/lib/sync && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sync/types.ts src/lib/sync/hash.ts src/lib/sync/hash.test.ts src/lib/sync/syncMeta.ts src/lib/sync/syncMeta.test.ts
git commit -m "feat(sync): add sync types, stable list hash and sync-meta storage"
```

---

### Task 4: Merge puro, commit de meta e remoto em memória

**Files:**
- Create: `src/lib/sync/merge.ts`, `src/lib/sync/memoryRemote.ts`
- Test: `src/lib/sync/merge.test.ts`

**Interfaces:**
- Consumes: tipos da Task 3, `hashList`.
- Produces:
  - `mergeRemote(local: List[], remote: RemoteListDoc[], meta: SyncMeta, now: number): MergeResult`
  - `nextSyncMeta(current: SyncMeta, result: MergeResult, pulled: RemoteListDoc[]): SyncMeta`
  - `recordDeletions(meta: SyncMeta, lists: List[], now: number): SyncMeta` (retorna o mesmo objeto se nada mudou)
  - `createMemoryRemote(): RemoteStore & { all(uid: string): RemoteListDoc[] }` (apoio a testes; `syncedAt` é um contador crescente)

Regras (tabela 4.3 do spec, com `deletedAt(id) = meta.deleted[id] ?? now`; "sincronizada antes" = `id ∈ meta.synced ∪ meta.deleted`):

| Local | Remoto | Resultado |
|---|---|---|
| ausente, nunca sincronizada | ativo | adiciona remoto |
| ausente, nunca sincronizada | tombstone | ignora |
| ausente, sincronizada antes | ativo, `updatedAt > deletedAt` | restaura remoto (exclusão resolvida) |
| ausente, sincronizada antes | ativo, `updatedAt ≤ deletedAt` | continua excluída; tombstone enviado |
| ausente, sincronizada antes | tombstone | exclusão resolvida, nada a enviar |
| presente, limpa | ativo | aplica remoto |
| presente, limpa | tombstone | remove local (resolvida) |
| presente, suja | ativo | `remote.updatedAt > local.updatedAt ?? 0` ⇒ remoto; senão local (enviado) |
| presente, suja | tombstone | `local.updatedAt ?? 0 > tombstone.updatedAt` ⇒ local (enviado); senão remove (resolvida) |

- [ ] **Step 1: Testes que falham** — `src/lib/sync/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mergeRemote, nextSyncMeta, recordDeletions } from './merge'
import { createMemoryRemote } from './memoryRemote'
import { hashList } from './hash'
import { emptySyncMeta } from './syncMeta'
import type { List } from '../../types'
import type { RemoteListDoc, SyncMeta } from './types'

const mk = (id: string, name = id, updatedAt = 1): List => ({
  id, name, type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false, updatedAt,
})
const active = (l: List, syncedAt = 100): RemoteListDoc => ({ id: l.id, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt, list: l })
const tomb = (id: string, updatedAt: number, syncedAt = 100): RemoteListDoc => ({ id, updatedAt, deleted: true, syncedAt })
const metaWith = (lists: List[], extra: Partial<SyncMeta> = {}): SyncMeta => ({
  ...emptySyncMeta('u1'),
  synced: Object.fromEntries(lists.map(l => [l.id, hashList(l)])),
  ...extra,
})
const NOW = 1_000

describe('mergeRemote', () => {
  it('adds a remote list that never existed locally', () => {
    const r = mergeRemote([], [active(mk('a'))], emptySyncMeta('u1'), NOW)
    expect(r.lists.map(l => l.id)).toEqual(['a'])
    expect(r.toPush).toEqual([])
  })

  it('ignores a remote tombstone for a list never seen locally', () => {
    const r = mergeRemote([], [tomb('a', 5)], emptySyncMeta('u1'), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([])
  })

  it('applies remote over a clean local list', () => {
    const local = mk('a', 'old', 1)
    const r = mergeRemote([local], [active(mk('a', 'new', 0))], metaWith([local]), NOW)
    expect(r.lists[0].name).toBe('new')
    expect(r.toPush).toEqual([])
  })

  it('dirty local newer than remote wins and is pushed', () => {
    const synced = mk('a', 'base', 1)
    const local = mk('a', 'local', 30)
    const r = mergeRemote([local], [active(mk('a', 'remote', 20))], metaWith([synced]), NOW)
    expect(r.lists[0].name).toBe('local')
    expect(r.toPush.map(l => l.name)).toEqual(['local'])
  })

  it('dirty local older than remote loses', () => {
    const synced = mk('a', 'base', 1)
    const r = mergeRemote([mk('a', 'local', 10)], [active(mk('a', 'remote', 20))], metaWith([synced]), NOW)
    expect(r.lists[0].name).toBe('remote')
    expect(r.toPush).toEqual([])
  })

  it('treats a legacy local list without updatedAt as oldest', () => {
    const legacy = { ...mk('a', 'legacy'), updatedAt: undefined }
    const r = mergeRemote([legacy], [active(mk('a', 'remote', 1))], emptySyncMeta('u1'), NOW)
    expect(r.lists[0].name).toBe('remote')
  })

  it('remote tombstone removes a clean local list and settles it', () => {
    const local = mk('a')
    const r = mergeRemote([local], [tomb('a', 5)], metaWith([local]), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('dirty local edited after the remote tombstone survives and is pushed', () => {
    const synced = mk('a', 'base', 1)
    const local = mk('a', 'edited', 50)
    const r = mergeRemote([local], [tomb('a', 40)], metaWith([synced]), NOW)
    expect(r.lists.map(l => l.name)).toEqual(['edited'])
    expect(r.toPush.map(l => l.id)).toEqual(['a'])
  })

  it('local deletion is pushed as tombstone with the recorded time', () => {
    const synced = mk('a')
    const r = mergeRemote([], [], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.tombstones).toEqual([{ id: 'a', deletedAt: 300 }])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('remote edit newer than the local deletion restores the list', () => {
    const synced = mk('a')
    const r = mergeRemote([], [active(mk('a', 'remote', 500))], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.lists.map(l => l.name)).toEqual(['remote'])
    expect(r.tombstones).toEqual([])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('remote edit older than the local deletion stays deleted', () => {
    const synced = mk('a')
    const r = mergeRemote([], [active(mk('a', 'remote', 200))], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([{ id: 'a', deletedAt: 300 }])
  })

  it('pushes never-synced local lists and keeps local order with remote additions last', () => {
    const r = mergeRemote([mk('x'), mk('y')], [active(mk('z'))], emptySyncMeta('u1'), NOW)
    expect(r.lists.map(l => l.id)).toEqual(['x', 'y', 'z'])
    expect(r.toPush.map(l => l.id)).toEqual(['x', 'y'])
  })
})

describe('nextSyncMeta', () => {
  it('records hashes of the merged lists, advances the cursor and drops settled deletions', () => {
    const current: SyncMeta = { ...emptySyncMeta('u1'), lastPulledAt: 50, deleted: { a: 1, b: 2 } }
    const result = { lists: [mk('c')], toPush: [], tombstones: [{ id: 'a', deletedAt: 1 }], settledDeletes: ['a'] }
    const next = nextSyncMeta(current, result, [tomb('x', 1, 70), active(mk('c'), 60)])
    expect(next.synced).toEqual({ c: hashList(mk('c')) })
    expect(next.lastPulledAt).toBe(70)
    expect(next.deleted).toEqual({ b: 2 })
  })

  it('keeps the cursor when nothing was pulled', () => {
    const next = nextSyncMeta({ ...emptySyncMeta('u1'), lastPulledAt: 50 }, { lists: [], toPush: [], tombstones: [], settledDeletes: [] }, [])
    expect(next.lastPulledAt).toBe(50)
  })
})

describe('recordDeletions', () => {
  it('records synced lists that disappeared, once', () => {
    const meta = metaWith([mk('a'), mk('b')])
    const once = recordDeletions(meta, [mk('b')], 10)
    expect(once.deleted).toEqual({ a: 10 })
    expect(recordDeletions(once, [mk('b')], 20)).toBe(once)
  })

  it('returns the same object when nothing changed', () => {
    const meta = metaWith([mk('a')])
    expect(recordDeletions(meta, [mk('a')], 10)).toBe(meta)
  })
})

// --- Property tests: two simulated devices sharing one memory remote ---

interface Device { lists: List[]; meta: SyncMeta }

const syncDevice = async (d: Device, remote: ReturnType<typeof createMemoryRemote>, now: number): Promise<Device> => {
  const meta = recordDeletions(d.meta, d.lists, now)
  const pulled = await remote.pullSince('u1', meta.lastPulledAt)
  const result = mergeRemote(d.lists, pulled, meta, now)
  await remote.push('u1', result.toPush, result.tombstones)
  return { lists: result.lists, meta: nextSyncMeta(meta, result, pulled) }
}

const contentById = (lists: List[]) =>
  Object.fromEntries(lists.map(l => [l.id, hashList(l)]))

type Op = { kind: 'upsert'; id: string; name: string } | { kind: 'delete'; id: string }
const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('upsert' as const), id: fc.constantFrom('a', 'b', 'c'), name: fc.string({ maxLength: 4 }) }),
  fc.record({ kind: fc.constant('delete' as const), id: fc.constantFrom('a', 'b', 'c') }),
)

const applyOps = (lists: List[], ops: Op[], at: number): List[] =>
  ops.reduce((acc, op, i) => {
    if (op.kind === 'delete') return acc.filter(l => l.id !== op.id)
    const updated = mk(op.id, op.name, at + i)
    return acc.some(l => l.id === op.id) ? acc.map(l => l.id === op.id ? updated : l) : [...acc, updated]
  }, lists)

describe('sync properties', () => {
  it('converges: after A syncs then B syncs then A syncs, both have the same content', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), fc.array(opArb, { maxLength: 6 }), async (opsA, opsB) => {
      const remote = createMemoryRemote()
      let a: Device = { lists: applyOps([], opsA, 10), meta: emptySyncMeta('u1') }
      let b: Device = { lists: applyOps([], opsB, 20), meta: emptySyncMeta('u1') }
      a = await syncDevice(a, remote, 100)
      b = await syncDevice(b, remote, 200)
      a = await syncDevice(a, remote, 300)
      expect(contentById(a.lists)).toEqual(contentById(b.lists))
    }))
  })

  it('never loses a list that exists only on one side', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), async ops => {
      const remote = createMemoryRemote()
      const lists = applyOps([], ops, 10)
      const a = await syncDevice({ lists, meta: emptySyncMeta('u1') }, remote, 100)
      const b = await syncDevice({ lists: [], meta: emptySyncMeta('u1') }, remote, 200)
      expect(contentById(b.lists)).toEqual(contentById(a.lists))
      expect(contentById(a.lists)).toEqual(contentById(lists))
    }))
  })

  it('is idempotent: a second sync with no changes pushes nothing', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), async ops => {
      const remote = createMemoryRemote()
      const a = await syncDevice({ lists: applyOps([], ops, 10), meta: emptySyncMeta('u1') }, remote, 100)
      const pulled = await remote.pullSince('u1', a.meta.lastPulledAt)
      const again = mergeRemote(a.lists, pulled, a.meta, 200)
      expect(again.toPush).toEqual([])
      expect(again.tombstones).toEqual([])
      expect(contentById(again.lists)).toEqual(contentById(a.lists))
    }))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/sync/merge.test.ts`
Expected: FAIL (módulos `./merge` e `./memoryRemote` não encontrados).

- [ ] **Step 3: Implementar `src/lib/sync/merge.ts`**

```ts
import type { List } from '../../types'
import type { MergeResult, RemoteListDoc, SyncMeta, Tombstone } from './types'
import { hashList } from './hash'

/**
 * Pure per-list merge, last edit wins (spec §4.3). `now` stands in for the
 * deletion time of lists whose deletion was not recorded in meta.deleted.
 */
export const mergeRemote = (local: List[], remote: RemoteListDoc[], meta: SyncMeta, now: number): MergeResult => {
  const byId = new Map(local.map(l => [l.id, l]))
  const order = local.map(l => l.id)
  const fromRemote = new Set<string>()
  const settled = new Set<string>()
  const wasSynced = (id: string) => id in meta.synced || id in meta.deleted
  const deletedAt = (id: string) => meta.deleted[id] ?? now
  const isDirty = (l: List) => hashList(l) !== meta.synced[l.id]

  const takeRemote = (doc: RemoteListDoc) => {
    if (!byId.has(doc.id)) order.push(doc.id)
    byId.set(doc.id, doc.list!)
    fromRemote.add(doc.id)
  }

  for (const doc of remote) {
    const l = byId.get(doc.id)
    if (l) {
      const dirty = isDirty(l)
      const localAt = l.updatedAt ?? 0
      if (doc.deleted) {
        if (!dirty || localAt <= doc.updatedAt) {
          byId.delete(doc.id)
          settled.add(doc.id)
        }
      } else if (doc.list && (!dirty || doc.updatedAt > localAt)) {
        takeRemote(doc)
      }
    } else if (wasSynced(doc.id)) {
      if (doc.deleted) {
        settled.add(doc.id)
      } else if (doc.list && doc.updatedAt > deletedAt(doc.id)) {
        takeRemote(doc)
        settled.add(doc.id)
      }
    } else if (!doc.deleted && doc.list) {
      takeRemote(doc)
    }
  }

  const lists = order.filter(id => byId.has(id)).map(id => byId.get(id)!)
  const toPush = lists.filter(l => !fromRemote.has(l.id) && isDirty(l))
  const tombstones: Tombstone[] = [...new Set([...Object.keys(meta.synced), ...Object.keys(meta.deleted)])]
    .filter(id => !byId.has(id) && !settled.has(id))
    .map(id => ({ id, deletedAt: deletedAt(id) }))

  return { lists, toPush, tombstones, settledDeletes: [...settled, ...tombstones.map(t => t.id)] }
}

/** Meta after a successful pull+push: every merged list is now in sync. */
export const nextSyncMeta = (current: SyncMeta, result: MergeResult, pulled: RemoteListDoc[]): SyncMeta => {
  const deleted = { ...current.deleted }
  for (const id of result.settledDeletes) delete deleted[id]
  const maxPulled = pulled.reduce((m, d) => Math.max(m, d.syncedAt), current.lastPulledAt ?? -Infinity)
  return {
    uid: current.uid,
    lastPulledAt: Number.isFinite(maxPulled) ? maxPulled : current.lastPulledAt,
    synced: Object.fromEntries(result.lists.map(l => [l.id, hashList(l)])),
    deleted,
  }
}

/** Records when a previously synced list vanished locally. Same object if nothing changed. */
export const recordDeletions = (meta: SyncMeta, lists: List[], now: number): SyncMeta => {
  const present = new Set(lists.map(l => l.id))
  const gone = Object.keys(meta.synced).filter(id => !present.has(id) && !(id in meta.deleted))
  if (gone.length === 0) return meta
  return { ...meta, deleted: { ...meta.deleted, ...Object.fromEntries(gone.map(id => [id, now])) } }
}
```

- [ ] **Step 4: Implementar `src/lib/sync/memoryRemote.ts`**

```ts
import type { List } from '../../types'
import type { RemoteListDoc, RemoteStore, Tombstone } from './types'

// JSON clone mimics Firestore with ignoreUndefinedProperties (undefined fields vanish)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** In-memory RemoteStore for tests; syncedAt is a monotonically increasing counter. */
export const createMemoryRemote = (): RemoteStore & { all(uid: string): RemoteListDoc[] } => {
  const users = new Map<string, Map<string, RemoteListDoc>>()
  let clock = 0
  const col = (uid: string) => {
    let c = users.get(uid)
    if (!c) users.set(uid, (c = new Map()))
    return c
  }
  return {
    all: uid => [...col(uid).values()].map(clone),
    async pullSince(uid, cursor) {
      return [...col(uid).values()].filter(d => cursor === null || d.syncedAt > cursor).map(clone)
    },
    async push(uid: string, lists: List[], tombstones: Tombstone[]) {
      const c = col(uid)
      for (const l of lists) c.set(l.id, { id: l.id, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt: ++clock, list: clone(l) })
      for (const t of tombstones) c.set(t.id, { id: t.id, updatedAt: t.deletedAt, deleted: true, syncedAt: ++clock })
    },
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/lib/sync && npx tsc --noEmit`
Expected: PASS (incluindo as 3 propriedades); `tsc` sem erros. Se uma propriedade falhar, o fast-check imprime o contra-exemplo mínimo — corrija `merge.ts`, não o teste.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sync/merge.ts src/lib/sync/merge.test.ts src/lib/sync/memoryRemote.ts
git commit -m "feat(sync): pure last-write-wins merge with tombstones and property tests"
```

---

### Task 5: Adaptadores Firebase, regras e configuração por env

**Files:**
- Create: `src/lib/firebase/config.ts`, `src/lib/firebase/client.ts`, `src/lib/firebase/remoteDoc.ts`, `src/lib/firebase/firestoreRemote.ts`, `src/lib/firebase/googleAuth.ts`, `src/lib/firebase/loadBackend.ts`, `src/lib/sync/errors.ts`
- Create: `firestore.rules`, `firebase.json`, `.env.example`, `vitest.rules.config.ts`, `firestore-tests/rules.test.ts`
- Modify: `src/vite-env.d.ts`, `vitest.config.ts`, `package.json` (script `test:rules`, devDependency)
- Test: `src/lib/firebase/config.test.ts`, `src/lib/firebase/remoteDoc.test.ts`, `src/lib/sync/errors.test.ts`

**Interfaces:**
- Consumes: `RemoteStore`, `AuthProvider`, `RemoteListDoc`, `Tombstone` (Task 3); decisão A/B (Task 1).
- Produces:
  - `getFirebaseConfig(env?): FirebaseConfig | null`, `isFirebaseConfigured(): boolean`
  - `toRemoteDoc(data: Record<string, unknown>): RemoteListDoc`
  - `createFirestoreRemote(): RemoteStore`
  - `createGoogleAuth(): Promise<AuthProvider>`
  - `export interface SyncBackend { auth: AuthProvider; remote: RemoteStore }`, `export type LoadBackend = () => Promise<SyncBackend>`, `loadBackend: LoadBackend | null` (em `loadBackend.ts`; `null` quando não configurado)
  - `classifyError(e: unknown): 'offline' | 'auth' | 'quota' | 'cancelled' | 'unknown'`, `withTimeout<T>(p: Promise<T>, ms: number): Promise<T>`, `class TimeoutError`

- [ ] **Step 1: Testes que falham** — `src/lib/firebase/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getFirebaseConfig } from './config'

const full = {
  VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'p.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a',
}

describe('getFirebaseConfig', () => {
  it('returns the config when every variable is set', () => {
    expect(getFirebaseConfig(full)).toEqual({ apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' })
  })

  it('returns null when any variable is missing or empty', () => {
    expect(getFirebaseConfig({ ...full, VITE_FIREBASE_APP_ID: '' })).toBeNull()
    expect(getFirebaseConfig({})).toBeNull()
  })
})
```

`src/lib/firebase/remoteDoc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toRemoteDoc } from './remoteDoc'
import { hashList } from '../sync/hash'
import type { List } from '../../types'

const ts = (ms: number) => ({ toMillis: () => ms })
const list: List = {
  id: 'l1', name: 'L', type: 'bar', currency: 'USD', taxPercentage: 5, archived: false, updatedAt: 9,
  items: [{ id: 'i', name: 'Beer', quantity: 1, unitPrice: 3, selected: true, includeInTax: false, unitType: 'unit' }],
  sections: [],
}

describe('toRemoteDoc', () => {
  it('maps an active document and strips sync fields from the list', () => {
    const doc = toRemoteDoc({ ...JSON.parse(JSON.stringify(list)), deleted: false, syncedAt: ts(77) })
    expect(doc).toMatchObject({ id: 'l1', updatedAt: 9, deleted: false, syncedAt: 77 })
    expect(doc.list).not.toHaveProperty('deleted')
    expect(doc.list).not.toHaveProperty('syncedAt')
    expect(hashList(doc.list!)).toBe(hashList(list))
  })

  it('maps a tombstone without list content', () => {
    expect(toRemoteDoc({ id: 'l1', updatedAt: 4, deleted: true, syncedAt: ts(5) }))
      .toEqual({ id: 'l1', updatedAt: 4, deleted: true, syncedAt: 5 })
  })

  it('defaults missing sections and a pending server timestamp', () => {
    const noSections = JSON.parse(JSON.stringify(list))
    delete noSections.sections
    const doc = toRemoteDoc({ ...noSections, deleted: false, syncedAt: null })
    expect(doc.list!.sections).toEqual([])
    expect(doc.syncedAt).toBe(0)
  })
})
```

`src/lib/sync/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { classifyError, withTimeout, TimeoutError } from './errors'

describe('classifyError', () => {
  it.each([
    ['unavailable', 'offline'],
    ['deadline-exceeded', 'offline'],
    ['auth/network-request-failed', 'offline'],
    ['permission-denied', 'auth'],
    ['unauthenticated', 'auth'],
    ['auth/user-token-expired', 'auth'],
    ['resource-exhausted', 'quota'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/cancelled-popup-request', 'cancelled'],
    ['weird', 'unknown'],
  ])('%s → %s', (code, kind) => {
    expect(classifyError({ code })).toBe(kind)
  })

  it('treats TimeoutError as offline', () => {
    expect(classifyError(new TimeoutError())).toBe('offline')
  })
})

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(1), 50)).resolves.toBe(1)
  })

  it('rejects with TimeoutError when the promise hangs', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toBeInstanceOf(TimeoutError)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/firebase src/lib/sync/errors.test.ts`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 3: Implementar `src/lib/sync/errors.ts`**

```ts
export class TimeoutError extends Error {
  readonly code = 'deadline-exceeded'
  constructor() {
    super('Network timeout')
  }
}

// Firestore writes never settle while offline, so every network call is bounded
export const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })

export type ErrorClass = 'offline' | 'auth' | 'quota' | 'cancelled' | 'unknown'

export const classifyError = (error: unknown): ErrorClass => {
  const code = (error as { code?: unknown } | null)?.code
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return 'offline'
    case 'permission-denied':
    case 'unauthenticated':
    case 'auth/user-token-expired':
      return 'auth'
    case 'resource-exhausted':
      return 'quota'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'cancelled'
    default:
      return 'unknown'
  }
}
```

- [ ] **Step 4: Implementar `src/lib/firebase/config.ts`**

```ts
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

type Env = Record<string, string | undefined>

/** Reads the web config from build-time env (.env.local). Null when sync is not configured. */
export const getFirebaseConfig = (env: Env = import.meta.env as Env): FirebaseConfig | null => {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  return Object.values(config).every(Boolean) ? (config as FirebaseConfig) : null
}

export const isFirebaseConfigured = (): boolean => getFirebaseConfig() !== null
```

- [ ] **Step 5: Implementar `src/lib/firebase/remoteDoc.ts`** (sem SDK, puro)

```ts
import type { List } from '../../types'
import type { RemoteListDoc } from '../sync/types'

const toMillis = (v: unknown): number =>
  v && typeof (v as { toMillis?: unknown }).toMillis === 'function' ? (v as { toMillis(): number }).toMillis() : 0

/** Converts Firestore document data into a RemoteListDoc. */
export const toRemoteDoc = (data: Record<string, unknown>): RemoteListDoc => {
  const { deleted, syncedAt, ...rest } = data
  const base = { id: String(data.id), updatedAt: Number(data.updatedAt ?? 0), deleted: deleted === true, syncedAt: toMillis(syncedAt) }
  if (base.deleted) return base
  const list = rest as unknown as List
  return { ...base, list: { ...list, sections: list.sections ?? [] } }
}
```

- [ ] **Step 6: Implementar `src/lib/firebase/client.ts` e `firestoreRemote.ts`**

`src/lib/firebase/client.ts`:
```ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { getFirebaseConfig } from './config'

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null

export const getFirebase = () => {
  if (cached) return cached
  const config = getFirebaseConfig()
  if (!config) throw new Error('Firebase is not configured')
  const app = initializeApp(config)
  cached = { app, auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }) }
  return cached
}
```

`src/lib/firebase/firestoreRemote.ts`:
```ts
import { collection, doc, getDocs, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore'
import type { RemoteStore } from '../sync/types'
import { getFirebase } from './client'
import { toRemoteDoc } from './remoteDoc'

const BATCH_LIMIT = 450 // Firestore allows 500 writes per batch

export const createFirestoreRemote = (): RemoteStore => {
  const { db } = getFirebase()
  const listsOf = (uid: string) => collection(db, 'users', uid, 'lists')

  return {
    async pullSince(uid, cursor) {
      const q = cursor === null ? listsOf(uid) : query(listsOf(uid), where('syncedAt', '>', Timestamp.fromMillis(cursor)))
      const snap = await getDocs(q)
      return snap.docs.map(d => toRemoteDoc(d.data()))
    },
    async push(uid, lists, tombstones) {
      const writes = [
        ...lists.map(l => ({ id: l.id, data: { ...l, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt: serverTimestamp() } })),
        // set() replaces the whole document, so tombstones drop the list content
        ...tombstones.map(t => ({ id: t.id, data: { id: t.id, updatedAt: t.deletedAt, deleted: true, syncedAt: serverTimestamp() } })),
      ]
      for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        for (const w of writes.slice(i, i + BATCH_LIMIT)) batch.set(doc(listsOf(uid), w.id), w.data)
        await batch.commit()
      }
    },
  }
}
```

- [ ] **Step 7: Implementar `src/lib/firebase/googleAuth.ts`** — use **uma** das variantes conforme a decisão da Task 1.

**Variante A (popup):**
```ts
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { AuthProvider } from '../sync/types'
import { getFirebase } from './client'

// Only the uid is ever read from the Firebase user
export const createGoogleAuth = async (): Promise<AuthProvider> => {
  const { auth } = getFirebase()
  return {
    // Must run synchronously inside the tap handler so iOS doesn't block the popup
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined),
    signOut: () => signOut(auth),
    onChange: cb => onAuthStateChanged(auth, user => cb(user?.uid ?? null)),
  }
}
```

**Variante B (Google Identity Services):** adicione também `VITE_GOOGLE_CLIENT_ID` em `.env.example`, em `src/vite-env.d.ts` e exija-o em `getFirebaseConfig` (inclua `googleClientId` na interface e no teste de config).
```ts
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth'
import type { AuthProvider } from '../sync/types'
import { getFirebase } from './client'

interface TokenResponse { access_token: string; error?: string }
interface Gis { accounts: { oauth2: { initTokenClient(c: {
  client_id: string; scope: string
  callback: (r: TokenResponse) => void
  error_callback: (e: { type: string }) => void
}): { requestAccessToken(): void } } } }

const loadGis = (): Promise<Gis> => new Promise((resolve, reject) => {
  const existing = (window as unknown as { google?: Gis }).google
  if (existing) return resolve(existing)
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'
  s.onload = () => resolve((window as unknown as { google: Gis }).google)
  s.onerror = () => reject(Object.assign(new Error('GIS failed to load'), { code: 'auth/network-request-failed' }))
  document.head.appendChild(s)
})

export const createGoogleAuth = async (): Promise<AuthProvider> => {
  const { auth } = getFirebase()
  const gis = await loadGis() // preloaded so signIn can open the popup synchronously
  return {
    signIn: () => new Promise<void>((resolve, reject) => {
      gis.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
        scope: 'openid email',
        callback: r => {
          if (r.error) return reject(Object.assign(new Error(r.error), { code: 'auth/popup-closed-by-user' }))
          signInWithCredential(auth, GoogleAuthProvider.credential(null, r.access_token)).then(() => resolve(), reject)
        },
        error_callback: e => reject(Object.assign(new Error(e.type), {
          code: e.type === 'popup_closed' ? 'auth/popup-closed-by-user' : 'auth/gis-error',
        })),
      }).requestAccessToken()
    }),
    signOut: () => signOut(auth),
    onChange: cb => onAuthStateChanged(auth, user => cb(user?.uid ?? null)),
  }
}
```

- [ ] **Step 8: Implementar `src/lib/firebase/loadBackend.ts`**

```ts
import type { AuthProvider, RemoteStore } from '../sync/types'
import { isFirebaseConfigured } from './config'

export interface SyncBackend {
  auth: AuthProvider
  remote: RemoteStore
}

export type LoadBackend = () => Promise<SyncBackend>

// The Firebase SDK is only downloaded when this runs (sign-in or a returning signed-in user)
export const loadBackend: LoadBackend | null = isFirebaseConfigured()
  ? async () => {
      const [{ createGoogleAuth }, { createFirestoreRemote }] = await Promise.all([
        import('./googleAuth'),
        import('./firestoreRemote'),
      ])
      return { auth: await createGoogleAuth(), remote: createFirestoreRemote() }
    }
  : null
```

- [ ] **Step 9: Tipos do env e `.env.example`**

Em `src/vite-env.d.ts`, ao final:
```ts
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}
```

`.env.example` (raiz):
```bash
# Copy to .env.local (git-ignored) and fill in from Firebase console → Project settings → Your apps.
# Without these values the app builds normally and cloud sync is hidden.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 10: Rodar unit tests e typecheck**

Run: `npx vitest run src/lib && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 11: Regras do Firestore** — `firestore.rules` (raiz):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/lists/{listId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
                            && request.resource.data.id == listId;
      // Deletions are tombstones (updates), never document deletes
      allow delete: if false;
    }
  }
}
```

`firebase.json` (raiz):
```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false }, "singleProjectMode": true }
}
```

- [ ] **Step 12: Teste de regras** — instale a lib e crie a config separada:

```bash
npm install --save-dev --save-exact @firebase/rules-unit-testing@5.0.2
```

`vitest.rules.config.ts` (raiz):
```ts
import { defineConfig } from 'vitest/config'

// Runs against the Firestore emulator via `npm run test:rules`; excluded from `npm test`
export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-tests/**/*.test.ts'],
  },
})
```

Em `vitest.config.ts`, acrescente `'firestore-tests/**'` ao array `exclude`:
```ts
    exclude: [...configDefaults.exclude, '.claude/**', '.git/**', '.kiro/**', 'firestore-tests/**'],
```

Em `package.json` → `scripts`:
```json
    "test:rules": "firebase emulators:exec --only firestore --project demo-billbuddy \"vitest run --config vitest.rules.config.ts\"",
```

`firestore-tests/rules.test.ts`:
```ts
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'

let env: RulesTestEnvironment
const listDoc = (id: string) => ({ id, name: 'L', updatedAt: 1, deleted: false })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-billbuddy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const seed = () => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'users/alice/lists/l1'), listDoc('l1')))

describe('firestore rules', () => {
  it('owner can create, update and read own lists', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice/lists/l1'), listDoc('l1')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/lists/l1'), { id: 'l1', updatedAt: 2, deleted: true }))
    await assertSucceeds(getDoc(doc(db, 'users/alice/lists/l1')))
  })

  it('another user cannot read or write', async () => {
    await seed()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice/lists/l1')))
    await assertFails(setDoc(doc(db, 'users/alice/lists/l2'), listDoc('l2')))
  })

  it('unauthenticated access is denied', async () => {
    await seed()
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice/lists/l1')))
  })

  it('document id must match the list id', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users/alice/lists/l1'), listDoc('other')))
  })

  it('hard deletes and a profile document are denied', async () => {
    await seed()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(deleteDoc(doc(db, 'users/alice/lists/l1')))
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'Alice' }))
  })
})
```

- [ ] **Step 13: Rodar os testes de regras** (precisa do Passo 0.8)

Run: `npm run test:rules`
Expected: emulator sobe, 5 testes PASS, emulator encerra.

- [ ] **Step 14: Confirmar que `npm test` ignora as regras e que o build sem env funciona**

Run: `npx vitest run && mv .env.local .env.local.bak; npm run build; mv .env.local.bak .env.local`
Expected: suíte PASS sem `firestore-tests`; build OK. Depois rode `grep -l "firebaseapp\|identitytoolkit" dist/assets/*.js | head` — Expected: os chunks do SDK existem só como chunks separados (carregados via `import()`), e `index-*.js` não contém `identitytoolkit`.

- [ ] **Step 15: Publicar as regras no projeto real**

```bash
firebase deploy --only firestore:rules --project <projectId>
```
Expected: `Deploy complete!`

- [ ] **Step 16: Commit**

```bash
git add src/lib/firebase src/lib/sync/errors.ts src/lib/sync/errors.test.ts src/vite-env.d.ts .env.example firestore.rules firebase.json vitest.rules.config.ts vitest.config.ts firestore-tests package.json package-lock.json
git status --short   # Expected: .env.local NÃO listado
git commit -m "feat(sync): firebase adapters, env-based config and firestore rules with emulator tests"
```

---

### Task 6: `SyncContext` — orquestração

**Files:**
- Create: `src/contexts/SyncContext.tsx`
- Test: `src/contexts/SyncContext.test.tsx`

**Interfaces:**
- Consumes: `useLists().lists/replaceLists` (Task 2); `mergeRemote`, `nextSyncMeta`, `recordDeletions` (Task 4); `loadSyncMeta`, `saveSyncMeta`, `clearSyncMeta`, `emptySyncMeta` (Task 3); `classifyError`, `withTimeout` (Task 5); `LoadBackend`, `SyncBackend` (Task 5).
- Produces:

```ts
export interface SyncContextValue {
  status: SyncStatus
  errorKind: SyncErrorKind | null
  lastSyncedAt: number | null
  prepare: () => void            // preloads the SDK (call when the settings sheet opens)
  signIn: () => Promise<void>    // call directly from a tap handler
  signOut: () => Promise<void>
  syncNow: () => void
}
export const SyncContext: React.Context<SyncContextValue>  // default = disabled no-op value
export const useSync: () => SyncContextValue               // works without a provider (disabled)
export const SyncProvider: (p: { children: ReactNode; loadBackend: LoadBackend | null; pushDebounceMs?: number; networkTimeoutMs?: number }) => JSX.Element
```

- [ ] **Step 1: Testes que falham** — `src/contexts/SyncContext.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor, cleanup } from '@testing-library/react'
import { ListsProvider, useLists } from './ListsContext'
import { SyncProvider, useSync } from './SyncContext'
import { createMemoryRemote } from '../lib/sync/memoryRemote'
import { emptySyncMeta, loadSyncMeta, saveSyncMeta } from '../lib/sync/syncMeta'
import type { List } from '../types'
import type { AuthProvider, RemoteStore } from '../lib/sync/types'

const mk = (id: string, name = id, updatedAt = 1): List => ({
  id, name, type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false, updatedAt,
})

const createFakeAuth = (initialUid: string | null = null) => {
  let uid = initialUid
  let listener: ((uid: string | null) => void) | null = null
  const auth: AuthProvider = {
    signIn: vi.fn(async () => { uid = 'u1'; listener?.(uid) }),
    signOut: vi.fn(async () => { uid = null; listener?.(null) }),
    onChange: cb => { listener = cb; cb(uid); return () => { listener = null } },
  }
  return auth
}

type Ctx = { lists: ReturnType<typeof useLists>; sync: ReturnType<typeof useSync> }

const setup = (opts: { remote?: RemoteStore; auth?: AuthProvider; local?: List[]; networkTimeoutMs?: number; configured?: boolean } = {}) => {
  localStorage.setItem('app', JSON.stringify({ lists: opts.local ?? [] }))
  const remote = opts.remote ?? createMemoryRemote()
  const auth = opts.auth ?? createFakeAuth()
  const loadBackend = opts.configured === false ? null : vi.fn(async () => ({ auth, remote }))
  let ctx!: Ctx
  const Capture = () => { ctx = { lists: useLists(), sync: useSync() }; return null }
  render(
    <ListsProvider>
      <SyncProvider loadBackend={loadBackend} pushDebounceMs={10} networkTimeoutMs={opts.networkTimeoutMs ?? 1000}>
        <Capture />
      </SyncProvider>
    </ListsProvider>,
  )
  return { get: () => ctx, remote, auth, loadBackend }
}

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('SyncProvider', () => {
  it('is disabled when Firebase is not configured', () => {
    const { get } = setup({ configured: false })
    expect(get().sync.status).toBe('disabled')
  })

  it('starts signed out without loading the SDK for a user who never signed in', () => {
    const { get, loadBackend } = setup()
    expect(get().sync.status).toBe('signedOut')
    expect(loadBackend).not.toHaveBeenCalled()
  })

  it('first sign-in merges local and remote lists', async () => {
    const remote = createMemoryRemote()
    await remote.push('u1', [mk('cloud')], [])
    const { get } = setup({ remote, local: [mk('local')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    expect(get().lists.lists.map(l => l.id).sort()).toEqual(['cloud', 'local'])
    expect(remote.all('u1').map(d => d.id).sort()).toEqual(['cloud', 'local'])
    expect(loadSyncMeta()?.uid).toBe('u1')
  })

  it('signIn calls auth.signIn synchronously after prepare (keeps the iOS tap gesture)', async () => {
    const { get, auth } = setup()
    act(() => get().sync.prepare())
    await waitFor(() => expect(get().sync.status).toBe('signedOut'))
    await act(async () => { await Promise.resolve() })
    void get().sync.signIn()
    expect(auth.signIn).toHaveBeenCalledTimes(1)
  })

  it('pushes a local edit after the debounce', async () => {
    const { get, remote } = setup({ local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    act(() => get().lists.updateList('a', { name: 'renamed' }))
    await waitFor(() => expect(remote.all('u1').find(d => d.id === 'a')?.list?.name).toBe('renamed'))
  })

  it('pushes a deletion as a tombstone', async () => {
    const { get, remote } = setup({ local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    act(() => get().lists.deleteList('a'))
    await waitFor(() => expect(remote.all('u1').find(d => d.id === 'a')?.deleted).toBe(true))
  })

  it('flushes immediately when the page is hidden', async () => {
    const { get, remote } = setup({ local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    const push = vi.spyOn(remote, 'push')
    act(() => get().lists.updateList('a', { name: 'x' }))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  it('resumes for a returning signed-in user and pulls on startup', async () => {
    const remote = createMemoryRemote()
    await remote.push('u1', [mk('cloud')], [])
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().lists.lists.map(l => l.id)).toEqual(['cloud']))
  })

  it('reports offline without calling the remote', async () => {
    const remote = createMemoryRemote()
    const pull = vi.spyOn(remote, 'pullSince')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().sync.status).toBe('offline'))
    expect(pull).not.toHaveBeenCalled()
  })

  it('a hanging network call times out to offline instead of syncing forever', async () => {
    const remote: RemoteStore = { pullSince: () => new Promise(() => {}), push: async () => {} }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1'), networkTimeoutMs: 20 })
    await waitFor(() => expect(get().sync.status).toBe('offline'))
  })

  it('permission errors surface as auth error', async () => {
    const remote: RemoteStore = { pullSince: async () => { throw { code: 'permission-denied' } }, push: async () => {} }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().sync.status).toBe('error'))
    expect(get().sync.errorKind).toBe('auth')
  })

  it('an expired session for a returning user asks to sign in again', async () => {
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ auth: createFakeAuth(null) })
    await waitFor(() => expect(get().sync.status).toBe('error'))
    expect(get().sync.errorKind).toBe('auth')
  })

  it('cancelling the Google popup is silent', async () => {
    const auth = createFakeAuth()
    auth.signIn = vi.fn(async () => { throw { code: 'auth/popup-closed-by-user' } })
    const { get } = setup({ auth })
    await act(async () => { await get().sync.signIn() })
    expect(get().sync.status).toBe('signedOut')
  })

  it('sign out keeps lists and clears sync-meta, even with a cycle in flight', async () => {
    let releasePush!: () => void
    const remote = createMemoryRemote()
    const { get } = setup({ remote, local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    vi.spyOn(remote, 'push').mockImplementation(() => new Promise<void>(r => { releasePush = r }))
    act(() => get().lists.updateList('a', { name: 'pending' }))
    await waitFor(() => expect(get().sync.status).toBe('syncing'))
    await act(async () => { await get().sync.signOut() })
    await act(async () => { releasePush() })
    expect(get().sync.status).toBe('signedOut')
    expect(loadSyncMeta()).toBeNull()
    expect(get().lists.lists.map(l => l.name)).toEqual(['pending'])
  })

  it('an edit made while a pull is in flight is kept and pushed afterwards', async () => {
    const memory = createMemoryRemote()
    let releasePull!: () => void
    const gate = new Promise<void>(r => { releasePull = r })
    const remote: RemoteStore = {
      pullSince: async (uid, cursor) => { await gate; return memory.pullSince(uid, cursor) },
      push: (uid, lists, tombs) => memory.push(uid, lists, tombs),
    }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1'), local: [mk('a')] })
    await waitFor(() => expect(get().sync.status).toBe('syncing'))
    act(() => get().lists.updateList('a', { name: 'during-pull' }))
    await act(async () => { releasePull() })
    await waitFor(() => expect(memory.all('u1').find(d => d.id === 'a')?.list?.name).toBe('during-pull'))
    expect(get().lists.lists[0].name).toBe('during-pull')
  })

  it('a different account on the same device starts a fresh merge', async () => {
    saveSyncMeta({ ...emptySyncMeta('other'), synced: { gone: 'h' } })
    const remote = createMemoryRemote()
    const { get } = setup({ remote, auth: createFakeAuth('u1'), local: [mk('a')] })
    await waitFor(() => expect(remote.all('u1').map(d => d.id)).toEqual(['a']))
    expect(loadSyncMeta()?.uid).toBe('u1')
    expect(remote.all('u1').some(d => d.deleted)).toBe(false)
    expect(get().sync.status).toBe('idle')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/contexts/SyncContext.test.tsx`
Expected: FAIL (módulo `./SyncContext` não encontrado).

- [ ] **Step 3: Implementar `src/contexts/SyncContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLists } from './ListsContext'
import type { SyncErrorKind, SyncMeta, SyncStatus } from '../lib/sync/types'
import type { LoadBackend, SyncBackend } from '../lib/firebase/loadBackend'
import { clearSyncMeta, emptySyncMeta, loadSyncMeta, saveSyncMeta } from '../lib/sync/syncMeta'
import { mergeRemote, nextSyncMeta, recordDeletions } from '../lib/sync/merge'
import { classifyError, withTimeout } from '../lib/sync/errors'

export interface SyncContextValue {
  status: SyncStatus
  errorKind: SyncErrorKind | null
  lastSyncedAt: number | null
  prepare: () => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => void
}

const DISABLED: SyncContextValue = {
  status: 'disabled', errorKind: null, lastSyncedAt: null,
  prepare: () => {}, signIn: async () => {}, signOut: async () => {}, syncNow: () => {},
}

export const SyncContext = createContext<SyncContextValue>(DISABLED)

// Works without a provider (tests, unconfigured builds): sync is simply disabled
export const useSync = () => useContext(SyncContext)

type Mode = 'full' | 'push'

interface SyncProviderProps {
  children: ReactNode
  loadBackend: LoadBackend | null
  pushDebounceMs?: number
  networkTimeoutMs?: number
}

export const SyncProvider = ({ children, loadBackend, pushDebounceMs = 2000, networkTimeoutMs = 15000 }: SyncProviderProps) => {
  const { lists, replaceLists } = useLists()
  const listsRef = useRef(lists)
  listsRef.current = lists

  const metaRef = useRef<SyncMeta | null>(loadSyncMeta())
  const backendRef = useRef<SyncBackend | null>(null)
  const backendPromiseRef = useRef<Promise<SyncBackend> | null>(null)
  const uidRef = useRef<string | null>(null)
  const runningRef = useRef(false)
  const pendingRef = useRef<Mode | null>(null)

  const [status, setStatus] = useState<SyncStatus>(loadBackend ? 'signedOut' : 'disabled')
  const [errorKind, setErrorKind] = useState<SyncErrorKind | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const fail = (error: unknown) => {
    const kind = classifyError(error)
    if (kind === 'offline') {
      setStatus('offline')
    } else {
      setStatus('error')
      setErrorKind(kind === 'auth' || kind === 'quota' ? kind : 'unknown')
    }
  }

  const runCycle = async (mode: Mode) => {
    const backend = backendRef.current
    const uid = uidRef.current
    if (!backend || !uid || !metaRef.current) return
    if (navigator.onLine === false) {
      setStatus('offline')
      return
    }
    setStatus('syncing')
    try {
      const pulled = mode === 'full'
        ? await withTimeout(backend.remote.pullSince(uid, metaRef.current.lastPulledAt), networkTimeoutMs)
        : []
      if (uidRef.current !== uid || !metaRef.current) return
      // Read lists after the await so edits made during the pull are merged, not overwritten
      const result = mergeRemote(listsRef.current, pulled, metaRef.current, Date.now())
      if (pulled.length > 0) replaceLists(result.lists)
      if (result.toPush.length > 0 || result.tombstones.length > 0) {
        await withTimeout(backend.remote.push(uid, result.toPush, result.tombstones), networkTimeoutMs)
      }
      // Signed out (or switched account) while the network call was in flight
      if (uidRef.current !== uid || !metaRef.current) return
      metaRef.current = nextSyncMeta(metaRef.current, result, pulled)
      saveSyncMeta(metaRef.current)
      setStatus('idle')
      setErrorKind(null)
      setLastSyncedAt(Date.now())
    } catch (error) {
      if (uidRef.current === uid) fail(error)
    }
  }

  // Single-flight: a trigger during a cycle queues one more run ('full' wins over 'push')
  const schedule = useCallback((mode: Mode) => {
    if (runningRef.current) {
      pendingRef.current = pendingRef.current === 'full' || mode === 'full' ? 'full' : 'push'
      return
    }
    runningRef.current = true
    void (async () => {
      let next: Mode | null = mode
      while (next) {
        pendingRef.current = null
        await runCycle(next)
        next = pendingRef.current
      }
      runningRef.current = false
    })()
    // runCycle only reads refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUid = useCallback((uid: string | null) => {
    uidRef.current = uid
    if (!uid) {
      // A returning user whose session expired keeps their sync-meta and is asked to sign in again
      if (metaRef.current) {
        setStatus('error')
        setErrorKind('auth')
      } else {
        setStatus('signedOut')
      }
      return
    }
    if (!metaRef.current || metaRef.current.uid !== uid) {
      metaRef.current = emptySyncMeta(uid)
      saveSyncMeta(metaRef.current)
    }
    schedule('full')
  }, [schedule])

  const ensureBackend = useCallback((): Promise<SyncBackend> | null => {
    if (!loadBackend) return null
    if (!backendPromiseRef.current) {
      backendPromiseRef.current = loadBackend().then(backend => {
        backendRef.current = backend
        backend.auth.onChange(handleUid)
        return backend
      })
      backendPromiseRef.current.catch(() => { backendPromiseRef.current = null })
    }
    return backendPromiseRef.current
  }, [loadBackend, handleUid])

  const prepare = useCallback(() => { void ensureBackend()?.catch(() => {}) }, [ensureBackend])

  const signIn = useCallback(async () => {
    try {
      // Already loaded: call synchronously so the popup stays inside the tap gesture
      const backend = backendRef.current ?? await ensureBackend()
      if (!backend) return
      await backend.auth.signIn()
    } catch (error) {
      if (classifyError(error) !== 'cancelled') fail(error)
    }
  }, [ensureBackend])

  const signOut = useCallback(async () => {
    uidRef.current = null
    metaRef.current = null
    clearSyncMeta()
    setStatus('signedOut')
    setErrorKind(null)
    setLastSyncedAt(null)
    await backendRef.current?.auth.signOut()
  }, [])

  const syncNow = useCallback(() => schedule('full'), [schedule])

  // Returning signed-in user: load the SDK and resume
  useEffect(() => {
    if (metaRef.current) prepare()
  }, [prepare])

  // Record deletions as they happen, then debounce a push
  useEffect(() => {
    if (!metaRef.current) return
    const updated = recordDeletions(metaRef.current, lists, Date.now())
    if (updated !== metaRef.current) {
      metaRef.current = updated
      saveSyncMeta(updated)
    }
    if (!uidRef.current) return
    const timer = setTimeout(() => schedule('push'), pushDebounceMs)
    return () => clearTimeout(timer)
  }, [lists, schedule, pushDebounceMs])

  // iOS kills backgrounded PWAs: flush on hide, pull on return / reconnect
  useEffect(() => {
    const onVisibility = () => schedule(document.visibilityState === 'visible' ? 'full' : 'push')
    const onOnline = () => schedule('full')
    const onPageHide = () => schedule('push')
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [schedule])

  const value: SyncContextValue = loadBackend
    ? { status, errorKind, lastSyncedAt, prepare, signIn, signOut, syncNow }
    : DISABLED

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
```

> Se o projeto não usa `eslint-plugin-react-hooks`, remova a linha `// eslint-disable-next-line`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/contexts/SyncContext.test.tsx`
Expected: PASS em todos. Se `vi.spyOn(navigator, 'onLine', 'get')` falhar no happy-dom por `onLine` não ser getter, use `Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })` e restaure no `afterEach`. Se o teste "signIn calls auth.signIn synchronously" falhar, verifique que `signIn` não faz `await` quando `backendRef.current` já existe (o `??` precisa avaliar o ref antes de qualquer `await`).

- [ ] **Step 5: Suíte completa e typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/SyncContext.tsx src/contexts/SyncContext.test.tsx
git commit -m "feat(sync): SyncProvider with debounced push, pull on resume and offline handling"
```

---

### Task 7: UI — conta, status e ligação no `App`

**Files:**
- Create: `src/lib/sync/formatSyncedAgo.ts`, `src/components/Sync/SyncStatusButton.tsx`, `src/components/Sync/AccountSheet.tsx`
- Modify: `src/components/shared/icons.tsx`, `src/i18n/en.ts`, `src/i18n/ptBR.ts`, `src/components/Dashboard/Dashboard.tsx`, `src/App.tsx`
- Test: `src/lib/sync/formatSyncedAgo.test.ts`, `src/components/Sync/Sync.test.tsx`

**Interfaces:**
- Consumes: `useSync()`, `SyncContext`, `SyncContextValue` (Task 6); `loadBackend` (Task 5); `BottomSheet`, `BottomSheetAction`.
- Produces: `formatSyncedAgo(ts: number, now: number, locale: string): string`; `<SyncStatusButton onOpen={() => void} />`; `<AccountSheet isOpen onClose />`; ícones `CloudIcon`, `CloudCheckIcon`, `CloudOffIcon`, `CloudAlertIcon`; chaves i18n listadas no Step 4.

- [ ] **Step 1: Testes que falham** — `src/lib/sync/formatSyncedAgo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatSyncedAgo } from './formatSyncedAgo'

describe('formatSyncedAgo', () => {
  it('formats recent times in English and Portuguese', () => {
    expect(formatSyncedAgo(1_000, 11_000, 'en')).toBe('now')
    expect(formatSyncedAgo(0, 120_000, 'en')).toBe('2 minutes ago')
    expect(formatSyncedAgo(0, 120_000, 'pt-BR')).toBe('há 2 minutos')
    expect(formatSyncedAgo(0, 3 * 3_600_000, 'pt-BR')).toBe('há 3 horas')
  })
})
```

`src/components/Sync/Sync.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import { SyncStatusButton } from './SyncStatusButton'
import { AccountSheet } from './AccountSheet'

const value = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
  status: 'idle', errorKind: null, lastSyncedAt: null,
  prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
  ...over,
})

const wrap = (ui: React.ReactNode, v: SyncContextValue) => {
  localStorage.setItem('locale', 'en')
  return render(<LanguageProvider><SyncContext.Provider value={v}>{ui}</SyncContext.Provider></LanguageProvider>)
}

afterEach(() => cleanup())

describe('SyncStatusButton', () => {
  it.each(['disabled', 'signedOut'] as const)('renders nothing when %s', status => {
    wrap(<SyncStatusButton onOpen={() => {}} />, value({ status }))
    expect(screen.queryByRole('button')).toBeNull()
  })

  it.each([
    ['idle', 'Synced'],
    ['syncing', 'Syncing…'],
    ['offline', 'Offline — changes saved on this device'],
    ['error', 'Sync failed'],
  ] as const)('shows %s status as accessible label', (status, label) => {
    const onOpen = vi.fn()
    wrap(<SyncStatusButton onOpen={onOpen} />, value({ status }))
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onOpen).toHaveBeenCalled()
  })
})

describe('AccountSheet', () => {
  it('offers sync now and sign out, with no personal data', () => {
    const v = value()
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    expect(screen.getByText('Your lists stay on this device.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(v.syncNow).toHaveBeenCalled()
  })

  it('offers sign in again on auth error', () => {
    const v = value({ status: 'error', errorKind: 'auth' })
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
    expect(v.signIn).toHaveBeenCalled()
  })

  it('signs out', () => {
    const v = value()
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(v.signOut).toHaveBeenCalled()
  })
})
```

Acrescente a `src/components/Dashboard/Dashboard.test.tsx` (imports: `SyncContext`, `type SyncContextValue` de `../../contexts/SyncContext`):

```tsx
  describe('cloud sync entry', () => {
    const syncValue = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
      status: 'signedOut', errorKind: null, lastSyncedAt: null,
      prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
      ...over,
    })
    const renderWithSync = (v: SyncContextValue) => render(
      <BrowserRouter><LanguageProvider><DarkModeProvider><SyncContext.Provider value={v}><Dashboard /></SyncContext.Provider></DarkModeProvider></LanguageProvider></BrowserRouter>,
    )
    const openSettings = () => fireEvent.click(screen.getByRole('button', { name: /^(settings|ajustes)$/i }))

    it('hides the sync entry when sync is disabled', () => {
      renderDashboard()
      openSettings()
      expect(screen.queryByText(/sync with google|sincronizar com google/i)).toBeNull()
    })

    it('signed out: preloads on open and signs in from the sheet', () => {
      const v = syncValue()
      renderWithSync(v)
      openSettings()
      expect(v.prepare).toHaveBeenCalled()
      fireEvent.click(screen.getByText(/sync with google|sincronizar com google/i))
      expect(v.signIn).toHaveBeenCalled()
    })
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/sync/formatSyncedAgo.test.ts src/components/Sync src/components/Dashboard`
Expected: FAIL (módulos inexistentes / entrada de sync ausente).

- [ ] **Step 3: `formatSyncedAgo`** — `src/lib/sync/formatSyncedAgo.ts`:

```ts
/** "now", "2 minutes ago", "há 3 horas"… */
export const formatSyncedAgo = (ts: number, now: number, locale: string): string => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const seconds = Math.round((ts - now) / 1000)
  if (Math.abs(seconds) < 60) return rtf.format(0, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}
```

- [ ] **Step 4: i18n** — em `src/i18n/en.ts`, antes de `lists: 'Lists',`:

```ts
  syncWithGoogle: 'Sync with Google',
  connectedWithGoogle: 'Connected with Google',
  syncAccount: 'Cloud sync',
  syncStatusIdle: 'Synced',
  syncStatusSyncing: 'Syncing…',
  syncStatusOffline: 'Offline — changes saved on this device',
  syncStatusError: 'Sync failed',
  syncNow: 'Sync now',
  signInAgain: 'Sign in again',
  signOut: 'Sign out',
  signOutHint: 'Your lists stay on this device.',
  lastSynced: 'Last synced',
  exportSyncHint: "Tip: sync with Google so you don't need to export. Your lists are kept if you change phones.",
  importSyncTitle: 'Import and sync?',
  importSyncWarning: 'Imported lists will replace the ones on this device and will be sent to the cloud.',
  syncBannerTitle: 'Keep your lists safe',
  syncBannerBody: 'Sync with Google to restore your lists on a new phone.',
  notNow: 'Not now',
```

Em `src/i18n/ptBR.ts`, na posição equivalente:

```ts
  syncWithGoogle: 'Sincronizar com Google',
  connectedWithGoogle: 'Conectado com Google',
  syncAccount: 'Sincronização na nuvem',
  syncStatusIdle: 'Sincronizado',
  syncStatusSyncing: 'Sincronizando…',
  syncStatusOffline: 'Offline — alterações salvas neste aparelho',
  syncStatusError: 'Falha ao sincronizar',
  syncNow: 'Sincronizar agora',
  signInAgain: 'Entrar novamente',
  signOut: 'Sair',
  signOutHint: 'Suas listas continuam neste aparelho.',
  lastSynced: 'Última sincronização',
  exportSyncHint: 'Dica: sincronize com o Google para não precisar exportar. Suas listas ficam salvas se trocar de celular.',
  importSyncTitle: 'Importar e sincronizar?',
  importSyncWarning: 'As listas importadas vão substituir as deste aparelho e serão enviadas para a nuvem.',
  syncBannerTitle: 'Proteja suas listas',
  syncBannerBody: 'Sincronize com o Google para recuperar suas listas em um celular novo.',
  notNow: 'Agora não',
```

- [ ] **Step 5: Ícones** — ao final de `src/components/shared/icons.tsx`:

```tsx
const CLOUD = 'M7 18a4 4 0 01-.5-7.97A6 6 0 0118 9a4.5 4.5 0 01-1 9H7z'

export const CloudIcon = (p: IconProps) => <Icon {...p}><path d={CLOUD} /></Icon>

export const CloudCheckIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M9.5 13.5l2 2 3.5-3.5" /></Icon>
)

export const CloudOffIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M4 4l16 16" /></Icon>
)

export const CloudAlertIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M12 11v3M12 16.5v.01" /></Icon>
)
```

- [ ] **Step 6: `SyncStatusButton`** — `src/components/Sync/SyncStatusButton.tsx`:

```tsx
import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { CloudAlertIcon, CloudCheckIcon, CloudIcon, CloudOffIcon } from '../shared/icons'

/** Header cloud icon; only shown while signed in. */
export const SyncStatusButton = ({ onOpen }: { onOpen: () => void }) => {
  const { status } = useSync()
  const { t } = useLanguage()
  if (status === 'disabled' || status === 'signedOut') return null

  const { label, icon } = {
    idle: { label: t.syncStatusIdle, icon: <CloudCheckIcon className="w-6 h-6" /> },
    syncing: { label: t.syncStatusSyncing, icon: <CloudIcon className="w-6 h-6 animate-pulse" /> },
    offline: { label: t.syncStatusOffline, icon: <CloudOffIcon className="w-6 h-6" /> },
    error: { label: t.syncStatusError, icon: <CloudAlertIcon className="w-6 h-6 text-danger" /> },
  }[status]

  return (
    <button
      onClick={onOpen}
      className="w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent"
      aria-label={label}
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 7: `AccountSheet`** — `src/components/Sync/AccountSheet.tsx`:

```tsx
import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { CloudIcon, CloseIcon } from '../shared/icons'
import { formatSyncedAgo } from '../../lib/sync/formatSyncedAgo'

/** Signed-in account actions. Shows no personal data (no name, photo or e-mail). */
export const AccountSheet = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { status, errorKind, lastSyncedAt, signIn, signOut, syncNow } = useSync()
  const { t, locale } = useLanguage()

  const statusText = {
    disabled: '', signedOut: '',
    idle: t.syncStatusIdle, syncing: t.syncStatusSyncing, offline: t.syncStatusOffline, error: t.syncStatusError,
  }[status]

  const actions: BottomSheetAction[] = [
    status === 'error' && errorKind === 'auth'
      ? { id: 'signin', label: t.signInAgain, icon: <CloudIcon />, onAction: () => { void signIn() } }
      : { id: 'sync', label: t.syncNow, icon: <CloudIcon />, onAction: syncNow },
    { id: 'signout', label: t.signOut, icon: <CloseIcon />, variant: 'destructive', onAction: () => { void signOut() } },
  ]

  return (
    <BottomSheet isOpen={isOpen} title={t.syncAccount} actions={actions} onClose={onClose}>
      <div className="text-center">
        <p className="text-body text-ink">{t.connectedWithGoogle} · {statusText}</p>
        {lastSyncedAt !== null && (
          <p className="text-footnote text-muted">{t.lastSynced}: {formatSyncedAgo(lastSyncedAt, Date.now(), locale)}</p>
        )}
        <p className="text-footnote text-muted mt-1">{t.signOutHint}</p>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 8: Dashboard** — em `src/components/Dashboard/Dashboard.tsx`:

Imports:
```tsx
import { useSync } from '../../contexts/SyncContext'
import { SyncStatusButton } from '../Sync/SyncStatusButton'
import { AccountSheet } from '../Sync/AccountSheet'
```
e adicione `CloudCheckIcon, CloudIcon` ao import de `../shared/icons`.

No componente, após `const { locale, setLocale, t } = useLanguage()`:
```tsx
  const sync = useSync()
  const [showAccount, setShowAccount] = useState(false)

  const openSettings = () => {
    sync.prepare() // load the SDK early so sign-in can open its popup within the tap
    setShowSettings(true)
  }

  const syncAction: BottomSheetAction[] =
    sync.status === 'disabled' ? []
    : sync.status === 'signedOut'
      ? [{ id: 'sync', label: t.syncWithGoogle, icon: <CloudIcon />, onAction: () => { void sync.signIn() } }]
      : [{ id: 'sync', label: t.connectedWithGoogle, icon: <CloudCheckIcon />, onAction: () => setShowAccount(true) }]
```

Em `settingsActions`, espalhe `...syncAction,` como primeiro elemento do array.

No header, troque `onClick={() => setShowSettings(true)}` por `onClick={openSettings}` e envolva o botão `…` junto com o indicador:
```tsx
            <div className="flex items-center gap-2">
              <SyncStatusButton onOpen={() => setShowAccount(true)} />
              <button
                onClick={openSettings}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent"
                aria-label={t.settings}
              >
                <EllipsisIcon className="w-6 h-6" />
              </button>
            </div>
```

Após o `<BottomSheet ... settings />`:
```tsx
      <AccountSheet isOpen={showAccount} onClose={() => setShowAccount(false)} />
```

- [ ] **Step 9: App** — em `src/App.tsx`:

```tsx
import { SyncProvider } from './contexts/SyncContext'
import { loadBackend } from './lib/firebase/loadBackend'
```
e envolva o `HashRouter` dentro de `ListsProvider`:
```tsx
        <ListsProvider>
          <SyncProvider loadBackend={loadBackend}>
            <HashRouter>
              {/* ...rotas inalteradas */}
            </HashRouter>
          </SyncProvider>
        </ListsProvider>
```

- [ ] **Step 10: Rodar e ver passar**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 11: Verificação visual local**

Run: `npm run dev`, abra `http://localhost:5173/bills-shopping-list/`.
Expected: `…` → "Sincronizar com Google" é o primeiro item; login abre o popup; após login aparece a nuvem com check no header; tocar nela abre o sheet sem nome/e-mail; "Sair" mantém as listas. Confira no console do Firebase → Firestore → `users/<uid>/lists/*`.

- [ ] **Step 12: Commit**

```bash
git add src/lib/sync/formatSyncedAgo.ts src/lib/sync/formatSyncedAgo.test.ts src/components/Sync src/components/shared/icons.tsx src/i18n/en.ts src/i18n/ptBR.ts src/components/Dashboard/Dashboard.tsx src/components/Dashboard/Dashboard.test.tsx src/App.tsx
git commit -m "feat(sync): Google sync entry, status indicator and account sheet"
```

---

### Task 8: Recomendações — export, import e banner único

**Files:**
- Create: `src/components/Sync/SyncBanner.tsx`
- Modify: `src/components/Dashboard/Dashboard.tsx`
- Test: `src/components/Sync/Sync.test.tsx`, `src/components/Dashboard/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `useSync()`; `exportData`, `importData`; `ConfirmDialog` (`variant="info"`, `confirmLabel`); chaves i18n da Task 7.
- Produces: `<SyncBanner listCount={number} />`; chave `localStorage` `sync-banner-dismissed` = `'1'`.

- [ ] **Step 1: Testes que falham** — acrescente a `src/components/Sync/Sync.test.tsx` (import `SyncBanner` de `./SyncBanner`; adicione `beforeEach(() => localStorage.clear())` no novo describe):

```tsx
describe('SyncBanner', () => {
  beforeEach(() => localStorage.clear())

  it('shows for signed-out users with 3+ lists and signs in', () => {
    const v = value({ status: 'signedOut' })
    wrap(<SyncBanner listCount={3} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sync with Google' }))
    expect(v.signIn).toHaveBeenCalled()
  })

  it('hides with fewer than 3 lists, when signed in or when disabled', () => {
    const { unmount } = wrap(<SyncBanner listCount={2} />, value({ status: 'signedOut' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    unmount()
    const r2 = wrap(<SyncBanner listCount={5} />, value({ status: 'idle' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    r2.unmount()
    wrap(<SyncBanner listCount={5} />, value({ status: 'disabled' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
  })

  it('stays dismissed', () => {
    const { unmount } = wrap(<SyncBanner listCount={3} />, value({ status: 'signedOut' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    unmount()
    wrap(<SyncBanner listCount={3} />, value({ status: 'signedOut' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    expect(localStorage.getItem('sync-banner-dismissed')).toBe('1')
  })
})
```

(adicione `beforeEach` ao import de `vitest` nesse arquivo.)

Acrescente ao topo de `Dashboard.test.tsx`, junto ao `vi.mock('../../hooks/useLists')` existente:

```tsx
import * as importExport from '../../lib/importExport'

vi.mock('../../lib/importExport', async importOriginal => ({
  ...(await importOriginal<typeof import('../../lib/importExport')>()),
  exportData: vi.fn(),
  importData: vi.fn(),
}))
```

E ao describe `cloud sync entry`:

```tsx
    it('recommends syncing after an export when signed out', async () => {
      vi.mocked(importExport.exportData).mockResolvedValue()
      renderWithSync(syncValue())
      openSettings()
      fireEvent.click(screen.getByText(/^export$|^exportar$/i))
      expect(await screen.findByText(/sync with google so you don't need to export|sincronize com o google para não precisar exportar/i)).toBeTruthy()
    })

    it('asks for confirmation before importing while signed in', async () => {
      vi.mocked(importExport.importData).mockResolvedValue({ lists: [] })
      const setItem = vi.spyOn(Storage.prototype, 'setItem')
      const { container } = renderWithSync(syncValue({ status: 'idle' }))
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await act(async () => {
        fireEvent.change(input, { target: { files: [new File(['{}'], 'b.json', { type: 'application/json' })] } })
      })
      expect(await screen.findByText(/will be sent to the cloud|serão enviadas para a nuvem/i)).toBeTruthy()
      expect(setItem).not.toHaveBeenCalledWith('app', expect.anything())
    })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/Sync src/components/Dashboard`
Expected: FAIL (`./SyncBanner` inexistente; dica e confirmação ausentes).

- [ ] **Step 3: `SyncBanner`** — `src/components/Sync/SyncBanner.tsx`:

```tsx
import { useState } from 'react'
import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { CloudIcon } from '../shared/icons'

const DISMISSED_KEY = 'sync-banner-dismissed'
const MIN_LISTS = 3

const readDismissed = () => {
  try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}

/** One-time nudge for users with enough data to lose who never signed in. */
export const SyncBanner = ({ listCount }: { listCount: number }) => {
  const { status, signIn } = useSync()
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (status !== 'signedOut' || listCount < MIN_LISTS || dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="mb-4 p-4 bg-surface rounded-group flex gap-3 items-start">
      <CloudIcon className="w-6 h-6 text-accent shrink-0" />
      <div className="flex-1">
        <p className="text-body font-semibold text-ink">{t.syncBannerTitle}</p>
        <p className="text-footnote text-muted">{t.syncBannerBody}</p>
        <div className="mt-2 flex gap-4">
          <button onClick={() => { void signIn() }} className="text-callout font-semibold text-accent">{t.syncWithGoogle}</button>
          <button onClick={dismiss} className="text-callout text-muted">{t.notNow}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Dashboard — export, import e banner** — em `src/components/Dashboard/Dashboard.tsx`:

Imports: `import { SyncBanner } from '../Sync/SyncBanner'` e `import type { AppState } from '../../types'`.

Estados (junto aos demais):
```tsx
  const [showSyncHint, setShowSyncHint] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppState | null>(null)
```

Substitua `handleExport`:
```tsx
  // Called straight from the tap so the share sheet keeps the user gesture
  const handleExport = () => {
    exportData({ lists })
      .then(() => {
        if (sync.status === 'signedOut') {
          setShowSyncHint(true)
          setTimeout(() => setShowSyncHint(false), 8000)
        }
      })
      .catch(() => {
        setImportError(t.exportFailed)
        setTimeout(() => setImportError(null), 3000)
      })
  }
```

Substitua o corpo do `try` de `handleImportFile` e adicione `applyImport`:
```tsx
  const applyImport = (data: AppState) => {
    localStorage.setItem('app', JSON.stringify(data))
    window.location.reload()
  }
```
```tsx
    try {
      const data = await importData(file)
      const signedIn = sync.status !== 'disabled' && sync.status !== 'signedOut'
      if (signedIn) setPendingImport(data)
      else applyImport(data)
    } catch (error) {
```

No conteúdo rolável, logo após o bloco `{importError && (...)}`:
```tsx
        {showSyncHint && (
          <div role="status" className="mb-4 p-3 bg-accent/10 text-ink rounded-group flex items-center gap-3">
            <p className="flex-1 text-callout">{t.exportSyncHint}</p>
            <button onClick={() => { setShowSyncHint(false); void sync.signIn() }} className="text-callout font-semibold text-accent">
              {t.syncWithGoogle}
            </button>
          </div>
        )}

        <SyncBanner listCount={regularLists.length} />
```

Após o `ConfirmDialog` existente:
```tsx
      <ConfirmDialog
        isOpen={pendingImport !== null}
        title={t.importSyncTitle}
        message={t.importSyncWarning}
        variant="info"
        confirmLabel={t.import}
        onConfirm={() => pendingImport && applyImport(pendingImport)}
        onCancel={() => setPendingImport(null)}
      />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/Sync/SyncBanner.tsx src/components/Sync/Sync.test.tsx src/components/Dashboard/Dashboard.tsx src/components/Dashboard/Dashboard.test.tsx
git commit -m "feat(sync): recommend Google sync on export, confirm import while signed in, one-time banner"
```

---

### Task 9: Documentação, verificação no iPhone e deploy

**Files:**
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: tudo acima.

- [ ] **Step 1: `README.md`** — na seção `## Deploy`, antes do bloco de `npm run deploy`, acrescente:

````markdown
### Cloud sync (optional)

Google sign-in + Firestore sync is enabled only when the Firebase web config is
present at build time. Copy `.env.example` to `.env.local` (git-ignored) and fill
it from Firebase console → Project settings → Your apps. Without it the app builds
and runs fully local, with sync hidden.

```bash
# Firestore security rules (after editing firestore.rules)
npm run test:rules                                   # needs Firebase CLI + Java
firebase deploy --only firestore:rules --project <projectId>
```

The web config ends up in the public bundle by design — it identifies the project,
it is not a secret. Access is protected by the Firestore rules, the Auth authorized
domains and the API key's referrer restriction.
````

- [ ] **Step 2: `CLAUDE.md`** — atualize:
  - "Key features": adicione `- Optional Google sign-in to sync lists with Firebase (Firestore, Spark plan)`.
  - Árvore `src/`: adicione `contexts/SyncContext.tsx`, `lib/sync/` (`types`, `hash`, `merge`, `syncMeta`, `errors`, `memoryRemote`, `formatSyncedAgo`), `lib/firebase/` (`config`, `client`, `remoteDoc`, `firestoreRemote`, `googleAuth`, `loadBackend`), `components/Sync/` (`SyncStatusButton`, `AccountSheet`, `SyncBanner`).
  - "State Management": item 3 **SyncContext** — opcional; `localStorage` é a fonte de verdade; diff por hash contra `sync-meta`; pull incremental por `syncedAt`; push com debounce de 2 s e flush ao ocultar; conflito por lista com `updatedAt`; tombstones; SDK carregado via `import()`. `ListsContext` ganhou `replaceLists` e carimba `updatedAt` em toda mutação.
  - "Data Model": `List.updatedAt?: number`; documento Firestore `users/{uid}/lists/{listId}`.
  - "Development Commands": `npm run test:rules`.
  - "Testing": novos arquivos de teste.

- [ ] **Step 3: Verificação final automatizada**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run test:rules`
Expected: tudo PASS; build OK.

- [ ] **Step 4: Commit da documentação do projeto**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document optional Google cloud sync and Firebase setup"
```

- [ ] **Step 5: Deploy manual** (com `.env.local` presente no checkout que faz o deploy)

```bash
npm run deploy
```

- [ ] **Step 6: Checklist manual no iPhone** (PWA instalado pela Tela de Início):
  - [ ] Login com Google funciona no standalone e persiste após fechar/reabrir.
  - [ ] Primeira mescla: listas locais existentes aparecem em `users/<uid>/lists` e listas da nuvem aparecem no app.
  - [ ] Modo avião: editar → indicador "Offline"; desligar modo avião e voltar ao app → "Sincronizado" e mudança no Firestore.
  - [ ] Editar e fechar o app imediatamente (swipe up) → mudança aparece no Firestore.
  - [ ] Excluir uma lista → documento vira `deleted: true` sem conteúdo.
  - [ ] Outro aparelho (ou Safari com dados limpos) → login → todas as listas (ativas, arquivadas, templates) aparecem.
  - [ ] "Sair" → listas continuam no aparelho; indicador some.
  - [ ] Console Firebase → Authentication: nenhum dado além do provedor Google; Firestore: nenhum documento `users/{uid}` de perfil.
  - [ ] Build sem `.env.local` (ex.: fork) não mostra opção de sincronizar.

- [ ] **Step 7: Abrir PR** (rascunho) do branch `feat/google-firebase-sync` para `master`, sem incluir `docs/superpowers/**`.
