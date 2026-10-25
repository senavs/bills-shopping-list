# Listas compartilhadas — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um usuário logado com Google crie uma lista compartilhada, convide outros por link e todos editem a mesma lista quase em tempo real, sem perder itens em edições simultâneas.

**Architecture:** Caminho de sync separado do pessoal. Uma lista local com `shared` é convertida para uma "forma remota" (pai com campos e mapas de pessoas e seções, itens como docs com `sectionId` e `position`). O diff contra um meta de hashes por entidade gera só as escritas necessárias, e os snapshots remotos são mesclados por entidade. Toda essa lógica é pura, em `src/lib/sharedSync/`. A orquestração fica num `SharedSyncProvider` novo, que usa o `uid` e o backend expostos pelo `SyncContext`. O adaptador Firestore (`onSnapshot`) é carregado de forma lazy pelo `loadBackend` existente.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Firebase 12 (Firestore e Auth), Vitest com Testing Library (happy-dom), `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-10-25-shared-lists-design.md` (ler junto com `docs/sync.md`).

## Global Constraints

- Toda string visível passa por `useLanguage().t`, com a chave em `src/i18n/en.ts` **e** `src/i18n/ptBR.ts`.
- Toda UI nova tem variantes `dark:`.
- Ids com `crypto.randomUUID()`. `inviteToken` também (36 caracteres, ≥ 20 exigidos pelas regras).
- Campos novos de `List` são opcionais. Dados antigos, JSON importado e docs Firestore não têm migração.
- O SDK do Firebase só entra via `import()` (`src/lib/firebase/loadBackend.ts`). Nada de `firebase/*` importado por módulo do bundle principal.
- Login continua por redirect. Nunca ler nome, foto ou e-mail do usuário Google.
- Testes de sync usam remotes em memória e auth fake, nunca o SDK real.
- Membros por lista: máximo **10**.
- Formato do link: `${origin}${pathname}#/join/{listId}?t={inviteToken}`.
- Chaves novas de `localStorage`: `shared-sync-meta`, `shared-name` (último nome usado no join ou na criação).
- Commits: Conventional Commits (`feat(shared): …`), **sem** trailer `Co-Authored-By` nem rodapé "Generated with".
- Antes de concluir cada task: `npx tsc --noEmit` e `npx vitest run`.

## Review Focus

1. **Eco do próprio push:** o snapshot que volta com a escrita do próprio cliente não pode marcar nada como sujo nem gerar um novo push (a convergência precisa parar). Teste na Task 6 (`merge` do snapshot igual ao form empurrado → zero escritas no diff seguinte).
2. **Primeiro snapshot vindo do cache:** um snapshot com `fromCache: true` não pode remover listas locais "ausentes" (logo após o login a query vem vazia ou parcial). Teste na Task 9.
3. **Edição feita durante um push em voo:** a edição precisa ser enviada no ciclo seguinte, sem ser apagada pelo meta gravado ao fim do push. Teste na Task 9 (aplicar o patch de meta só das entidades empurradas).
4. **Reordenar dentro de uma seção:** só o item movido recebe `position` nova, e dois clientes reordenando itens diferentes convergem. Teste na Task 3 (estabilidade) e na Task 6.
5. **Item excluído offline num cliente e editado no outro:** o tombstone remoto não remove um item local sujo, e a exclusão local suja não ressuscita com o remoto limpo. Teste na Task 6.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/types/index.ts` | `SharedInfo` e `List.shared?` |
| `src/lib/sync/hash.ts` | exporta `hashValue` (o `stable` existente) |
| `src/lib/sync/preserveShared.ts` | `withSharedPreserved` para o sync pessoal |
| `src/lib/sharedSync/types.ts` | forma remota, meta, escritas, interface `SharedRemote` |
| `src/lib/sharedSync/positions.ts` | `positionBetween`, `assignPositions` |
| `src/lib/sharedSync/convert.ts` | `toForm`, `fromForm` |
| `src/lib/sharedSync/diff.ts` | `diffLocal`, `applyMetaPatch`, `metaFromForm` |
| `src/lib/sharedSync/merge.ts` | `mergeSnapshot` |
| `src/lib/sharedSync/sharedMeta.ts` | load/save/clear de `shared-sync-meta` |
| `src/lib/sharedSync/invite.ts` | `buildInviteUrl`, `shareInvite` |
| `src/lib/sharedSync/status.ts` | `combineStatus` |
| `src/lib/sharedSync/memorySharedRemote.ts` | fake em memória que aplica as mesmas regras de acesso |
| `src/lib/firebase/sharedRemote.ts` | adaptador Firestore de `SharedRemote` |
| `src/contexts/SharedSyncContext.tsx` | orquestração |
| `src/components/Join/JoinPage.tsx` | rota `/join/:listId` |
| `src/components/shared/SharedNotices.tsx` | avisos de lista excluída ou sem acesso |
| `firestore.rules`, `firestore-tests/rules.test.ts` | regras e testes |

---

### Task 1: Modelo de dados e `ListsContext`

**Files:**
- Modify: `src/types/index.ts`, `src/contexts/ListsContext.tsx`, `src/lib/sync/hash.ts`
- Test: `src/contexts/ListsContext.test.tsx`

**Interfaces:**
- Produces:
  - `interface SharedInfo { ownerUid: string; inviteToken: string; memberPeople?: Record<string, string> }`; `List.shared?: SharedInfo`
  - `hashValue(value: unknown): string`: FNV-1a sobre o `stable` existente. `hashList` passa a usá-lo e mantém o mesmo resultado (o teste existente de hash continua passando).
  - `ListsContext`:
    - `replaceLists(next: List[] | ((prev: List[]) => List[])): void`
    - `createSharedList(input: Omit<List, 'id' | 'items' | 'sections' | 'archived' | 'people' | 'shared'>, owner: { uid: string; name: string }): string`: retorna o id; cria `people: [{ id: pid, name }]` e `shared: { ownerUid: uid, inviteToken: crypto.randomUUID(), memberPeople: { [uid]: pid } }`.
    - `addMemberPerson(listId: string, uid: string, name: string): void`: adiciona a `Person` e grava `shared.memberPeople[uid]`; estampa `updatedAt`.

- [ ] **Step 1: Testes que falham** em `ListsContext.test.tsx`:
  - `createSharedList` → a lista tem `shared.ownerUid === 'u1'`, `inviteToken` com 36 caracteres, `people[0].name === 'Ana'` e `memberPeople.u1 === people[0].id`; retorna o id.
  - `addMemberPerson(id, 'u2', 'Bia')` → nova pessoa `Bia`, `memberPeople.u2` aponta para ela, `memberPeople.u1` intacto.
  - `duplicateList`, `saveAsTemplate` e `createFromTemplate` de uma lista compartilhada → a cópia tem `shared === undefined`.
  - `replaceLists(prev => prev.slice(1))` remove a primeira lista e **não** muda `updatedAt` das outras.
- [ ] **Step 2:** `npx vitest run src/contexts/ListsContext.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar. Em `duplicateList` e `addTemplateCopy`, desestruturar `shared` para fora da cópia. `replaceLists` repassa o argumento ao `setLists`.
- [ ] **Step 4:** Rodar de novo → PASS; `npx tsc --noEmit` limpo.
- [ ] **Step 5:** Commit `feat(shared): add shared list model and context mutations`.

### Task 2: Sync pessoal ignora listas compartilhadas

**Files:**
- Create: `src/lib/sync/preserveShared.ts`, `src/lib/sync/preserveShared.test.ts`
- Modify: `src/contexts/SyncContext.tsx`
- Test: `src/contexts/SyncContext.test.tsx`

**Interfaces:**
- Consumes: `replaceLists` funcional (Task 1).
- Produces:
  - `withSharedPreserved(prev: List[], personal: List[]): List[]`: as listas de `prev` com `shared` ficam no mesmo índice, as posições restantes recebem `personal` na ordem, e as sobras vão para o fim.
  - `SyncContextValue` ganha `uid: string | null` e `backend: SyncBackend | null` (estado React, setado em `handleUid` e quando o backend carrega). No `DISABLED`, os dois são `null`.

- [ ] **Step 1: Testes que falham:**
  - `preserveShared.test.ts`: `withSharedPreserved([p1, S, p2], [p2', p1', p3])` → `[p2', S, p1', p3]`.
  - `SyncContext.test.tsx`: uma lista local com `shared` nunca aparece em `remote.all('u1')` depois de um ciclo; ela continua em `lists` depois de um pull que trouxe outra lista; excluí-la localmente não cria tombstone pessoal.
  - `get().sync.uid === 'u1'` depois do sign-in, e `null` depois do sign-out.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Em `runCycle`, `mergeRemote(listsRef.current.filter(l => !l.shared), …)` e `replaceLists(prev => withSharedPreserved(prev, result.lists))`. No effect de `recordDeletions`, passar só as listas sem `shared`.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `fix(sync): keep shared lists out of personal sync`.

### Task 3: Posições fracionárias

**Files:**
- Create: `src/lib/sharedSync/positions.ts`, `src/lib/sharedSync/positions.test.ts`

**Interfaces:**
- Produces:
  - `positionBetween(before: number | undefined, after: number | undefined): number`: `(b+a)/2`; sem `after` → `before + 1`; sem `before` → `after - 1`; nenhum dos dois → `0`.
  - `assignPositions(order: string[], known: Record<string, number>): Record<string, number>`: posições estritamente crescentes na ordem de `order`.

Algoritmo de `assignPositions`: os ids com posição conhecida que formam a **maior subsequência crescente** (LIS) de `known` mantêm a posição. Os demais recebem `positionBetween` entre o vizinho anterior já atribuído e o próximo mantido. Se algum intervalo ficar menor que `1e-9`, renumerar o grupo inteiro como `0, 1, 2, …`.

- [ ] **Step 1: Testes que falham:**
  - `assignPositions(['a','b','c'], {})` → `{a:0,b:1,c:2}`.
  - Mover `c` para o início em `{a:0,b:1,c:2}` → `a` e `b` mantêm 0 e 1, e `c < 0`.
  - Inserir `x` entre `a:0` e `b:1` → `x === 0.5`, e o resto fica igual.
  - Para ordens aleatórias (`fast-check`), o resultado é estritamente crescente e, quando `order` já está em ordem crescente de `known`, devolve exatamente `known`.
  - Cinquenta inserções seguidas no mesmo ponto → continua estritamente crescente (renumera).
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(shared): add fractional positions`.

### Task 4: Forma remota e conversão

**Files:**
- Create: `src/lib/sharedSync/types.ts`, `src/lib/sharedSync/convert.ts`, `src/lib/sharedSync/convert.test.ts`

**Interfaces:**
- Consumes: `assignPositions` (Task 3), `SharedInfo` (Task 1).
- Produces (em `types.ts`):

```ts
export interface SharedItem extends Omit<Item, 'id'> { id: string; sectionId: string | null; position: number }
export type RemoteItem = SharedItem | { id: string; deleted: true }   // doc de item no Firestore (vivo ou tombstone)
export interface SharedForm {
  fields: { name: string; type: List['type']; currency: List['currency']; taxPercentage: number }
  memberPeople: Record<string, string>
  people: Record<string, { name: string; position: number }>
  sections: Record<string, { name: string; position: number }>
  items: Record<string, SharedItem>
}
export interface SharedParentDoc {
  id: string; ownerUid: string; inviteToken: string; members: string[]; deleted: boolean; updatedAt: number
  memberPeople: SharedForm['memberPeople']; people: SharedForm['people']; sections: SharedForm['sections']
  name: string; type: List['type']; currency: List['currency']; taxPercentage: number
}
export interface EntityMeta { hash: string; position?: number }
export interface ListMeta {
  pendingCreate?: true
  fields: Record<string, string>          // 'name' | 'type' | 'currency' | 'taxPercentage' | `memberPeople.${uid}` → hash
  people: Record<string, EntityMeta>
  sections: Record<string, EntityMeta>
  items: Record<string, EntityMeta>
}
export interface SharedMeta { uid: string; lists: Record<string, ListMeta>; pendingOps: { kind: 'leave' | 'delete'; listId: string }[] }
```

- `toForm(list: List, meta: ListMeta | undefined): SharedForm`: grupos de itens = `section.itemIds` de cada seção, mais "Outros itens" (itens de `list.items` fora de qualquer seção, na ordem de `list.items`). As posições saem de `assignPositions` por grupo com `known` vindo de `meta.items[id].position`. Pessoas e seções fazem o mesmo, com a ordem do array local.
- `fromForm(form: SharedForm, base: { id: string; shared: SharedInfo; archived: boolean; updatedAt?: number; collapsed: Record<string, boolean> }): List`:
  - seções ordenadas por `position`;
  - `itemIds` = itens com aquele `sectionId`, por `position`;
  - itens cujo `sectionId` não existe entram em "Outros itens";
  - `items` = itens das seções na ordem das seções, depois "Outros itens";
  - `people` ordenado por `position`;
  - `shared.memberPeople = form.memberPeople`.

- [ ] **Step 1: Testes que falham:**
  - Ida e volta: `fromForm(toForm(L, undefined), baseDe(L))` reproduz `L` (itens de seção mais itens soltos, ordem preservada, `collapsed` e `archived` preservados).
  - Item com `sectionId` órfão aparece em "Outros itens" (fora de qualquer `itemIds`).
  - `toForm` com meta conhecido devolve as mesmas posições do meta quando a ordem não mudou.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(shared): convert lists to and from remote form`.

### Task 5: Diff, meta e persistência do meta

**Files:**
- Create: `src/lib/sharedSync/diff.ts`, `src/lib/sharedSync/diff.test.ts`, `src/lib/sharedSync/sharedMeta.ts`, `src/lib/sharedSync/sharedMeta.test.ts`

**Interfaces:**
- Consumes: `toForm`, `hashValue`, tipos da Task 4.
- Produces:

```ts
export interface ParentPatch { set: Record<string, unknown>; remove: string[] }   // chaves = caminhos de campo ('name', 'people.<id>', 'memberPeople.<uid>')
export type ItemWrite = RemoteItem
export interface ListMetaPatch { fields: Record<string, string | null>; people: Record<string, EntityMeta | null>; sections: Record<string, EntityMeta | null>; items: Record<string, EntityMeta | null> }
export interface LocalDiff { parent: ParentPatch; items: ItemWrite[]; pushed: ListMetaPatch; empty: boolean }

diffLocal(list: List, meta: ListMeta | undefined): LocalDiff
applyMetaPatch(meta: ListMeta | undefined, patch: ListMetaPatch): ListMeta
metaFromForm(form: SharedForm): ListMeta
emptySharedMeta(uid: string): SharedMeta
loadSharedMeta(): SharedMeta | null; saveSharedMeta(m: SharedMeta): void; clearSharedMeta(): void
```

- O hash de pessoa, seção e item é `hashValue` da entidade na forma remota (inclui `position`, e no item também `sectionId`). O `EntityMeta.position` guarda a posição remota.
- Escritas geradas pelo diff:
  - entidade nova ou com hash diferente → `set`;
  - entidade no meta e ausente no local → `remove` (pessoa ou seção) ou `{ id, deleted: true }` (item);
  - campo escalar com hash diferente → `set` do caminho.
- `pushed` carrega os hashes novos (`null` para removidos), para o orquestrador aplicar **depois** do push.

- [ ] **Step 1: Testes que falham:**
  - `diffLocal(L, undefined)` para uma lista nova → `set` de `name`, `type`, `currency`, `taxPercentage`, `people.*`, `memberPeople.*`, e um `ItemWrite` por item.
  - `diffLocal(L, metaFromForm(toForm(L)))` → `empty: true`.
  - Mudar só a quantidade de 1 item → exatamente 1 `ItemWrite` e `parent` vazio.
  - Excluir um item → `{ id, deleted: true }`; excluir uma pessoa → `remove: ['people.<id>']`.
  - Mover um item de seção → 1 `ItemWrite` com o `sectionId` novo.
  - `applyMetaPatch` com `null` remove a entrada.
  - `loadSharedMeta` devolve `null` para JSON inválido ou sem `uid`; ida e volta de `save` e `load` preserva tudo.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(shared): diff local lists against sync meta`.

### Task 6: Merge de snapshot remoto

**Files:**
- Create: `src/lib/sharedSync/merge.ts`, `src/lib/sharedSync/merge.test.ts`

**Interfaces:**
- Consumes: Tasks 4 e 5.
- Produces: `mergeSnapshot(local: List | undefined, parent: SharedParentDoc, items: Record<string, RemoteItem> | null, meta: ListMeta | undefined): { list: List; meta: ListMeta }`

Regra, por entidade: o local está **sujo** quando `hashValue(localForm.x) !== meta.x.hash`, ou quando a entidade foi apagada localmente e ainda está no meta.
- Limpo → vale o remoto, e `meta.x` = hash e posição do remoto. Ausente no remoto, ou tombstone → remove a entidade e a entrada do meta.
- Sujo → mantém o local e o meta da entidade **não muda**.

`items === null` (itens ainda não carregados) mantém os itens locais. Com `local === undefined`, tudo vem do remoto e o meta é `metaFromForm`. A lista final sai de `fromForm`, com `archived` e `collapsed` do local (default `false`) e `shared` montado do pai (`ownerUid`, `inviteToken`, `memberPeople`).

- [ ] **Step 1: Testes que falham:**
  - Lista nova vinda do remoto → igual a `fromForm`; o diff seguinte é `empty`.
  - **Eco:** `mergeSnapshot(L, docDe(toForm(L)), itensDe(toForm(L)), meta)` → lista igual a `L` e `diffLocal` vazio.
  - **Dois clientes na mesma seção:** A adiciona `i1` e B adiciona `i2` na seção `s`. Aplicar a escrita de A no remoto, depois a de B, e fazer o merge em A → A tem `i1` e `i2` em `s.itemIds`.
  - Item local sujo + remoto alterado → mantém o local; o diff seguinte reenvia o local.
  - Tombstone remoto + item local limpo → item removido; tombstone remoto + item local sujo → item mantido.
  - Item apagado localmente (sujo) + remoto limpo inalterado → continua apagado e o diff reenvia o tombstone.
  - `archived: true` e `collapsed` locais sobrevivem ao merge.
  - Campo `name` sujo localmente + `taxPercentage` alterado no remoto → os dois valores convivem.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(shared): merge remote snapshots per entity`.

### Task 7: Regras do Firestore

**Files:**
- Modify: `firestore.rules`, `firestore-tests/rules.test.ts`

**Interfaces:** documentos da Task 4 (`SharedParentDoc`, `SharedItem`) e `sharedLists/{id}/joins/{uid} = { token }`.

Regras (o resto do arquivo não muda):

```
match /sharedLists/{listId} {
  function changed() { return request.resource.data.diff(resource.data).affectedKeys(); }
  function isMember(d) { return request.auth.uid in d.members; }
  function ownMemberPeopleOnly() {
    return !changed().hasAny(['memberPeople'])
      || request.resource.data.memberPeople.diff(resource.data.memberPeople).affectedKeys().hasOnly([request.auth.uid]);
  }
  function memberEdit() {
    return isMember(resource.data)
      && !changed().hasAny(['id', 'ownerUid', 'inviteToken', 'members'])
      && ownMemberPeopleOnly()
      && (request.resource.data.deleted == false || request.auth.uid == resource.data.ownerUid);
  }
  function join() {
    return !isMember(resource.data)
      && changed().hasOnly(['members'])
      && request.resource.data.members == resource.data.members.concat([request.auth.uid])
      && request.resource.data.members.size() <= 10
      && getAfter(/databases/$(database)/documents/sharedLists/$(listId)/joins/$(request.auth.uid)).data.token == resource.data.inviteToken;
  }
  function leave() {
    return isMember(resource.data) && request.auth.uid != resource.data.ownerUid
      && changed().hasOnly(['members', 'memberPeople'])
      && request.resource.data.members == resource.data.members.removeAll([request.auth.uid])
      && ownMemberPeopleOnly();
  }
  allow get, list: if request.auth != null && isMember(resource.data);
  allow create: if request.auth != null
    && request.resource.data.id == listId
    && request.resource.data.ownerUid == request.auth.uid
    && request.resource.data.members == [request.auth.uid]
    && request.resource.data.deleted == false
    && request.resource.data.inviteToken is string && request.resource.data.inviteToken.size() >= 20;
  allow update: if request.auth != null && resource.data.deleted == false && (memberEdit() || join() || leave());
  allow delete: if false;

  match /joins/{uid} {
    allow get: if request.auth != null && request.auth.uid == uid;
    allow create, update: if request.auth != null && request.auth.uid == uid
      && request.resource.data.keys().hasOnly(['token']) && request.resource.data.token is string;
  }
  match /items/{itemId} {
    function parent() { return get(/databases/$(database)/documents/sharedLists/$(listId)).data; }
    allow read: if request.auth != null && request.auth.uid in parent().members;
    allow create, update: if request.auth != null && request.resource.data.id == itemId
      && request.auth.uid in parent().members && parent().deleted == false;
  }
}
```

- [ ] **Step 1: Testes que falham** (bloco `describe('shared lists')`, com `writeBatch` para o join):
  - não membro não lê o pai nem os itens;
  - a criação exige `members == [uid]` e `ownerUid == uid`;
  - join com token certo → sucesso; com token errado → falha;
  - **depois que bob entrou, carol entra sem o doc `joins/carol` (só `arrayUnion`) → falha**;
  - bob não consegue adicionar carol a `members`;
  - bob não muda `ownerUid`/`inviteToken`, nem `deleted: true`; alice (dona) consegue `deleted: true`;
  - bob não grava `memberPeople.alice`; grava `memberPeople.bob`;
  - bob sai (remove só a si, remove a própria chave de `memberPeople`) → sucesso; sair removendo `memberPeople.alice` → falha; a dona sair → falha;
  - o 11º membro → falha;
  - membro escreve item; escreve item com `id` diferente do doc → falha; escreve item depois de `deleted: true` → falha;
  - `deleteDoc` do pai ou de item → falha.
- [ ] **Step 2:** `npm run test:rules` → FAIL. (Precisa do Firebase CLI e de Java. Sem eles, registre isso no relatório e siga para a próxima task.)
- [ ] **Step 3:** Implementar as regras. **Step 4:** `npm run test:rules` → PASS.
- [ ] **Step 5:** Commit `feat(shared): add firestore rules for shared lists`.

### Task 8: `SharedRemote`: interface, fake em memória e adaptador Firestore

**Files:**
- Modify: `src/lib/sharedSync/types.ts`, `src/lib/firebase/loadBackend.ts`, `src/contexts/SyncContext.test.tsx` (o helper `setup` inclui `shared`)
- Create: `src/lib/sharedSync/memorySharedRemote.ts`, `src/lib/sharedSync/memorySharedRemote.test.ts`, `src/lib/firebase/sharedRemote.ts`

**Interfaces:**
- Produces:

```ts
export interface SharedRemote {
  create(uid: string, doc: SharedParentDoc): Promise<void>          // idempotente: se já existir e uid for membro, resolve sem escrever
  join(uid: string, listId: string, token: string): Promise<'joined' | 'already'>
  leave(uid: string, listId: string): Promise<void>                 // members −uid e memberPeople.<uid> removido
  deleteList(uid: string, listId: string): Promise<void>            // deleted: true, updatedAt
  push(listId: string, parent: ParentPatch, items: ItemWrite[]): Promise<void>
  subscribeLists(uid: string, cb: (docs: SharedParentDoc[], fromCache: boolean) => void, onError: (e: unknown) => void): () => void
  subscribeItems(listId: string, cb: (items: Record<string, RemoteItem>) => void, onError: (e: unknown) => void): () => void
}
```

  `SyncBackend` ganha `shared: SharedRemote`.
- Erros: as negações lançam `{ code: 'permission-denied' }`, que o `classifyError` existente classifica como `'auth'`; a rede lança `{ code: 'unavailable' }` (`'offline'`).
- `memorySharedRemote`: aplica as mesmas regras de acesso da Task 7 (membro, token, limite de 10, dono para excluir). Os callbacks rodam de forma síncrona após cada escrita (`fromCache: false`), e há um `setOnline(false)` que faz as escritas rejeitarem com erro de rede. Também expõe `peek(listId)` para os testes.
- `sharedRemote.ts`:
  - `join` tenta um `getDoc` primeiro (sucesso com o uid em `members` → `'already'`) e, se falhar, faz um `writeBatch` com `joins/{uid}` mais `members: arrayUnion(uid)`;
  - `push` usa `updateDoc` com os caminhos de `set`, `deleteField()` para `remove`, `updatedAt: Date.now()` e `syncedAt: serverTimestamp()`, mais um `set` por item com `updatedAt` e `syncedAt` (lotes de 450 como no `firestoreRemote`);
  - `subscribeLists` usa `query(collection('sharedLists'), where('members', 'array-contains', uid))` e passa `snapshot.metadata.fromCache`;
  - `subscribeItems` usa `onSnapshot(collection(sharedLists/{id}/items))`.

- [ ] **Step 1: Testes que falham** (`memorySharedRemote.test.ts`):
  - `join` com token errado → rejeita com `permission-denied`; com o certo → `'joined'`; de novo → `'already'`;
  - não membro `subscribeItems` → `onError`;
  - `push` de um não membro → rejeita;
  - `subscribeLists` recebe o doc atualizado depois do `push`;
  - `leave` tira o uid e a chave de `memberPeople`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. `npx tsc --noEmit` limpo. `npm run build` → conferir que o chunk principal não contém `firebase/firestore` (comparar o tamanho do `index-*.js` com o da `master`).
- [ ] **Step 5:** Commit `feat(shared): add shared remote adapters`.

### Task 9: `SharedSyncProvider`

**Files:**
- Create: `src/contexts/SharedSyncContext.tsx`, `src/contexts/SharedSyncContext.test.tsx`, `src/lib/sharedSync/status.ts`
- Modify: `src/App.tsx` (o `SharedSyncProvider` fica dentro do `SyncProvider`)

**Interfaces:**
- Consumes: `useSync().uid` e `useSync().backend` (Task 2), `useLists()` (Task 1), Tasks 5, 6 e 8.
- Produces:

```ts
export interface SharedNotice { id: string; kind: 'deleted' | 'removed'; listName: string }
export interface SharedSyncValue {
  status: 'idle' | 'syncing' | 'offline' | 'error'
  isPendingCreate(listId: string): boolean
  joinList(listId: string, token: string): Promise<'ok' | 'invalid' | 'network'>
  leaveList(listId: string): void
  deleteSharedList(listId: string): void
  notices: SharedNotice[]
  dismissNotice(id: string): void
}
export const useSharedSync: () => SharedSyncValue   // sem provider: status 'idle', ações no-op (como o useSync)
combineStatus(a: SyncStatus, b: SharedSyncValue['status']): SyncStatus   // prioridade error > offline > syncing > idle; 'disabled'/'signedOut' em a vencem
```

Comportamento (cada item tem pelo menos um teste):
1. **Ciclo single-flight**, no mesmo padrão do `schedule` do `SyncContext`, com debounce de 1000 ms (prop `pushDebounceMs`) e flush em `visibilitychange`/`pagehide`/`online`.
   - Primeiro a fila `pendingOps`: `leave`/`deleteList`; no sucesso, remove a op e a entrada de `meta.lists`.
   - Depois as listas locais com `shared`:
     - sem entrada no meta e `ownerUid === uid` → marca `pendingCreate`, chama `create` com o doc montado de `toForm` e, no sucesso, faz o `push` dos itens;
     - com entrada → `diffLocal` e, se não estiver `empty`, `push` seguido de `applyMetaPatch(metaAtual, pushed)`.
   - Uma lista local sem entrada no meta e com `ownerUid !== uid` não gera escrita nenhuma.
2. **Listeners**, enquanto `uid && backend`: `subscribeLists`, mais `subscribeItems` para cada pai não `deleted` cuja lista local não esteja `archived`. Os listeners são recalculados quando o conjunto muda.
   - Cada callback chama `mergeSnapshot` para a lista, `replaceLists(prev => …)` substituindo ou acrescentando no lugar, e grava o meta.
3. **Remoções:** pai com `deleted: true` → remove a lista local e a entrada do meta e cria um notice `deleted`. Uma lista local `shared` ausente de um snapshot `fromCache: false`, sem `pendingCreate` e sem op pendente → remove e cria um notice `removed`. Com `fromCache: true`, nada é removido.
4. **Troca de uid:** se `meta.uid !== uid`, o meta vira `emptySharedMeta(uid)`. As cópias locais ficam até o primeiro snapshot do servidor decidir o destino delas (item 3).
5. **`uid` null** (sign-out ou sessão expirada) → desliga os listeners e **mantém** o meta.
6. `joinList`: chama `backend.shared.join` dentro de `withTimeout` (escritas do Firestore nunca terminam offline; todas as chamadas remotas deste provider usam `withTimeout`, prop `networkTimeoutMs`, default 15000). `classifyError` `'auth'` → `'invalid'`; qualquer outro erro → `'network'`. Em `'joined'` ou `'already'` → `'ok'`.
7. `leaveList` e `deleteSharedList`: chamam o `deleteList` do contexto, empilham a op e agendam o ciclo. `deleteSharedList` só age se `uid === shared.ownerUid`.

- [ ] **Step 1: Testes que falham** (dois "aparelhos" = dois `render` com `ListsProvider` separados e o mesmo `memorySharedRemote`; `localStorage` é compartilhado no happy-dom, então isolar o `app` e o `shared-sync-meta` por aparelho com um wrapper de storage, ou usar um aparelho de cada vez e trocar o estado entre eles):
  - A cria uma lista via `createSharedList` → depois do debounce, `remote.peek(id)` existe com `members: ['u1']`.
  - B `joinList` com o token → a lista aparece em B; B chama `addMemberPerson` → A vê a pessoa nova.
  - A e B adicionam um item cada, com debounce em paralelo → os dois aparelhos terminam com os 2 itens.
  - **Edição durante push em voo:** atrasar o `push` do remote, editar no meio → o ciclo seguinte envia a edição.
  - Snapshot `fromCache: true` vazio não remove a lista; `fromCache: false` vazio remove e cria um notice `removed`.
  - A dona exclui → B perde a lista e recebe um notice `deleted`.
  - Offline (`setOnline(false)`): B sai → a op fica em `pendingOps` e é enviada quando volta a conexão.
  - Sign-out → os listeners param, e o `shared-sync-meta` continua no storage.
  - Lista arquivada não tem listener de itens; ao desarquivar, recebe os itens.
  - `combineStatus('idle', 'error') === 'error'`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(shared): orchestrate shared list sync`.

### Task 10: Import e export

**Files:**
- Modify: `src/lib/importExport.ts`, `src/components/Dashboard/Dashboard.tsx`
- Test: `src/lib/importExport.test.ts` (criar se não existir)

**Interfaces:**
- Produces:
  - `stripShared(list: List): List`;
  - `mergeImportWithShared(imported: AppState, current: List[]): AppState`: tira `shared` das listas importadas e dá ids novos (lista, itens e seções, remapeando `itemIds`, como em `duplicateList`) às importadas cujo id coincide com uma lista `shared` de `current`. No fim acrescenta as listas `shared` de `current`.

- [ ] **Step 1: Testes que falham:**
  - um JSON com `shared` passa em `validateImportData`;
  - `mergeImportWithShared` com uma importada de mesmo id que uma compartilhada local → as duas existem, a importada tem id novo e `shared` indefinido, e os `itemIds` das seções apontam para ids de itens que existem;
  - a compartilhada local é preservada.
- [ ] **Step 2–4:** FAIL → implementar → PASS. No `Dashboard`: `applyImport` grava `mergeImportWithShared(data, lists)`, e o export usa `lists.map(stripShared)`.
- [ ] **Step 5:** Commit `feat(shared): keep shared lists across import and export`.

### Task 11: Criar lista compartilhada (`ListForm`)

**Files:**
- Modify: `src/components/ListForm/ListForm.tsx`, `src/i18n/en.ts`, `src/i18n/ptBR.ts`
- Test: `src/components/ListForm/ListForm.test.tsx`

**Interfaces:** consome `createSharedList` (Task 1) e `useSync()` (`status`, `uid`, `signIn`).

i18n (`en` / `ptBR`):
- `sharedList`: 'Shared list' / 'Lista compartilhada'
- `sharedListHint`: 'Everyone you invite can add and edit items' / 'Quem você convidar pode adicionar e editar itens'
- `signInToShare`: 'Sign in with Google to share' / 'Entrar com Google para compartilhar'
- `yourNameInList`: 'Your name in this list' / 'Seu nome nesta lista'
- `yourNameRequired`: 'Enter your name' / 'Digite seu nome'

- [ ] **Step 1: Testes que falham:**
  - sem provider de sync (`status: 'disabled'`) → nenhum checkbox "Lista compartilhada";
  - em `/lists/:id/edit` → não aparece;
  - `signedOut` → o checkbox fica desabilitado e o botão `signInToShare` chama `signIn`;
  - logado (`uid: 'u1'`), marcado, sem nome → mostra `yourNameRequired` e não cria;
  - com o nome `Ana` → cria uma lista com `shared.ownerUid === 'u1'` e a pessoa `Ana`, e `localStorage['shared-name'] === 'Ana'`;
  - o campo de nome vem preenchido com `shared-name`.

  Para controlar `status` e `uid`, renderizar com `<SyncContext.Provider value={…}>`.
- [ ] **Step 2–4:** FAIL → implementar (classes `dark:` nos elementos novos) → PASS.
- [ ] **Step 5:** Commit `feat(shared): create shared lists from the list form`.

### Task 12: Convite e "Pessoas e membros"

**Files:**
- Create: `src/lib/sharedSync/invite.ts`, `src/lib/sharedSync/invite.test.ts`
- Modify: `src/components/PeopleManager/PeopleManager.tsx`, `src/components/ListDetail/ListDetail.tsx`, `src/i18n/en.ts`, `src/i18n/ptBR.ts`
- Create test: `src/components/PeopleManager/PeopleManager.test.tsx`

**Interfaces:**
- Produces:
  - `buildInviteUrl(base: string, listId: string, token: string): string`, onde `base = origin + pathname`;
  - `shareInvite(url: string, text: string, nav?: Pick<Navigator, 'share' | 'clipboard'>): Promise<'shared' | 'copied' | 'failed'>`. O usuário cancelar o share (`AbortError`) conta como `'shared'`.
  - `PeopleManager` ganha a prop opcional `shared?: { myPersonId?: string; memberPersonIds: string[]; onInvite: () => void; inviteDisabled: boolean }`.

i18n:
- `peopleAndMembers`: 'People & members' / 'Pessoas e membros'
- `you`: 'you' / 'você'
- `usingApp`: 'Using the app' / 'Usando o app'
- `invite`: 'Invite' / 'Convidar'
- `inviteMore`: 'Invite more' / 'Convidar mais'
- `inviteShareText`: 'Join my list "{name}" on BillBuddy' / 'Entre na minha lista "{name}" no BillBuddy'
- `inviteLinkCopied`: 'Invite link copied' / 'Link do convite copiado'
- `inviteWaitingConnection`: 'Waiting for connection' / 'Aguardando conexão'
- `sharedSignInToSync`: 'Sign in to sync this shared list' / 'Entre para sincronizar esta lista compartilhada'

- [ ] **Step 1: Testes que falham:**
  - `buildInviteUrl('https://x.io/app/', 'L1', 'T')` → `'https://x.io/app/#/join/L1?t=T'`;
  - `shareInvite` sem `share` → chama `clipboard.writeText` e devolve `'copied'`;
  - `PeopleManager` com `shared`:
    - o título é `peopleAndMembers`;
    - a pessoa `myPersonId` mostra `you`;
    - as pessoas em `memberPersonIds` mostram o ícone com `aria-label` `usingApp` e **não** têm botão de remover;
    - quem não é membro tem o ×;
    - `inviteMore` chama `onInvite`; com `inviteDisabled`, o botão fica desabilitado e mostra `inviteWaitingConnection`;
  - sem `shared` → igual ao comportamento atual (título `people`, sem convite).
- [ ] **Step 2–4:** FAIL → implementar → PASS.
  - No `ListDetail`, para listas com `shared`:
    - passar `shared` ao `PeopleManager`, com `myPersonId = memberPeople[uid]`, `memberPersonIds = Object.values(memberPeople)` e `inviteDisabled = isPendingCreate(id)`;
    - atalho `invite` perto do título;
    - os dois chamam `shareInvite(buildInviteUrl(…), t.inviteShareText.replace('{name}', list.name))` e mostram `inviteLinkCopied` em `'copied'`;
    - com `uid === null`, mostrar a faixa `sharedSignInToSync`.
- [ ] **Step 5:** Commit `feat(shared): invite members and show people & members`.

### Task 13: Página de convite (`/join/:listId`)

**Files:**
- Create: `src/components/Join/JoinPage.tsx`, `src/components/Join/JoinPage.test.tsx`
- Modify: `src/App.tsx` (rota dentro de `AppWithAds`), `src/i18n/en.ts`, `src/i18n/ptBR.ts`

**Interfaces:** consome `useSync()` (`status`, `uid`, `signIn`), `useSharedSync().joinList`, `useLists()` (`lists`, `addMemberPerson`) e `useSearchParams().get('t')`.

Estados: `signIn` (deslogado) → `joining` → `waiting` (até a lista aparecer em `lists`) → `name` (se `shared.memberPeople[uid]` não existe) → `navigate('/lists/:id', { replace: true })`. Erros: `invalid` e `network` (este com botão de tentar de novo). Sem `t` → `invalid`. Se a lista já está local e com vínculo → navega direto.

i18n:
- `joinTitle`: 'You were invited to a shared list' / 'Você foi convidado para uma lista compartilhada'
- `joinSignIn`: 'Sign in with Google' / 'Entrar com Google'
- `joinJoining`: 'Joining…' / 'Entrando…'
- `joinInvalid`: 'Invalid or expired invite' / 'Convite inválido ou expirado'
- `joinNetworkError`: 'Could not connect. Check your internet and try again.' / 'Não foi possível conectar. Verifique sua internet e tente de novo.'
- `joinRetry`: 'Try again' / 'Tentar de novo'
- `joinContinue`: 'Continue' / 'Continuar'

Também reutiliza `yourNameInList` e `yourNameRequired`.

- [ ] **Step 1: Testes que falham** (`MemoryRouter` em `/join/L1?t=T`, com `SyncContext.Provider` e `SharedSyncContext` mockados):
  - deslogado → `joinTitle` e o botão `joinSignIn` chama `signIn`;
  - `joinList` → `'invalid'` mostra `joinInvalid`;
  - `'network'` → `joinRetry` chama `joinList` de novo;
  - `'ok'` com a lista local sem vínculo → pede o nome, preenchido com `shared-name`; ao continuar, chama `addMemberPerson('L1', 'u2', 'Bia')` e navega para `/lists/L1`;
  - lista local com vínculo → navega sem pedir nome;
  - sem `?t=` → `joinInvalid`.
- [ ] **Step 2–4:** FAIL → implementar (com `dark:`) → PASS.
- [ ] **Step 5:** Commit `feat(shared): join shared lists from invite links`.

### Task 14: Dashboard, sair/excluir, avisos e status

**Files:**
- Modify: `src/components/Dashboard/ListCard.tsx`, `src/components/Dashboard/Dashboard.tsx`, `src/components/Sync/SyncStatusButton.tsx`, `src/i18n/en.ts`, `src/i18n/ptBR.ts`
- Create: `src/components/shared/SharedNotices.tsx` (renderizado no `App`, dentro do `SharedSyncProvider`)
- Test: `src/components/Dashboard/Dashboard.test.tsx`, `src/components/shared/SharedNotices.test.tsx`

**Interfaces:** consome `useSharedSync()` (Task 9), `combineStatus` (Task 9) e `useSync().uid`.

i18n:
- `sharedBadge`: 'Shared' / 'Compartilhada'
- `leaveList`: 'Leave list' / 'Sair da lista'
- `leaveListMessage`: 'You will no longer see this list. The other members keep it.' / 'Você deixará de ver esta lista. Os outros membros continuam com ela.'
- `deleteForEveryone`: 'Delete for everyone' / 'Excluir para todos'
- `deleteForEveryoneMessage`: 'The list will be deleted for all members.' / 'A lista será excluída para todos os membros.'
- `sharedListDeletedNotice`: '"{name}" was deleted by its owner' / '"{name}" foi excluída pela dona ou dono'
- `sharedListRemovedNotice`: 'You no longer have access to "{name}"' / 'Você não tem mais acesso a "{name}"'

- [ ] **Step 1: Testes que falham:**
  - card de lista `shared` mostra `sharedBadge`; com `uid === null`, mostra também `sharedSignInToSync` (chave da Task 12);
  - não dono: o menu mostra `leaveList`, e confirmar chama `leaveList(id)`;
  - dono: mostra `deleteForEveryone` com `deleteForEveryoneMessage`, e confirmar chama `deleteSharedList(id)`;
  - lista privada continua com o `deleteList` atual;
  - `SharedNotices` renderiza o texto com o nome, e fechar chama `dismissNotice`;
  - `SyncStatusButton` com o personal `idle` e o shared `error` → `aria-label` de erro.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(shared): leave, delete-for-everyone and notices`.

### Task 15: Documentação e verificação final

**Files:**
- Modify: `docs/sync.md` (seção "Listas compartilhadas": layout dos arquivos, formato remoto, regras, a regra do `fromCache` e o lembrete de deploy das regras), `CLAUDE.md` (acrescentar `shared-sync-meta` e `shared-name` às chaves de `localStorage` e citar `src/lib/sharedSync/` na seção Sync)

- [ ] **Step 1:** Escrever as duas seções.
- [ ] **Step 2:** `npx tsc --noEmit` → sem erros; `npx vitest run` → tudo verde; `npm run build` → sucesso; `npm run test:rules` → verde (ou registrar que o ambiente não tem Firebase CLI e Java).
- [ ] **Step 3:** Commit `docs(sync): document shared lists`.
- [ ] **Step 4:** Registrar no relatório que, antes do deploy do app, é preciso rodar `firebase deploy --only firestore:rules --project prod-billbuddy`.
