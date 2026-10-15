# Sincronização com Google via Firebase — Design

- **Data:** 2026-10-15
- **Branch:** `feat/google-firebase-sync`
- **Status:** aprovado em conversa; aguardando revisão do documento

## 1. Objetivo e contexto

Hoje todo o estado do app vive no `localStorage` (chave `app`). Para não perder dados ao trocar
ou formatar o celular, o usuário precisa exportar um JSON e importá-lo no aparelho novo. Não há
nenhuma cópia na nuvem.

**Objetivo:** permitir que o usuário, **opcionalmente**, entre com a conta Google e tenha suas
listas sincronizadas no Firebase (plano gratuito Spark), de modo que ao instalar o app num
aparelho novo e logar, as listas apareçam sozinhas.

### Requisitos (definidos pelo dono do produto)

1. O app continua **offline-first** e 100% utilizável **sem login**.
2. Login apenas via **Google**; serve exclusivamente para sincronizar.
3. **Sem backend próprio** — tudo no front-end falando com Firebase.
4. Plano **Spark (grátis)**.
5. Export/Import em JSON continuam funcionando, com recomendação para sincronizar com o Google.
6. **Mínimo de dados pessoais:** o app não grava nome, foto, e-mail, telefone, data de
   nascimento etc. No Firestore existem apenas o `uid` (no caminho do documento) e as listas.
7. Dados das listas ficam **sem criptografia** por enquanto (criptografia é trabalho futuro).
8. **Nenhuma configuração do Firebase versionada no repositório** (repo é público). O deploy
   continua manual, passando as variáveis no build.

### Critérios de sucesso

- Logar num aparelho novo → todas as listas (ativas, arquivadas, templates) aparecem.
- Editar offline → ao voltar online/reabrir o app, as mudanças chegam à nuvem.
- Fechar o app logo após editar não perde a edição na nuvem (flush ao ocultar).
- Usuário que nunca loga não baixa o SDK do Firebase e não percebe diferença de comportamento.
- Build sem variáveis do Firebase funciona e simplesmente esconde a opção de login.

### Premissas de uso

- Normalmente **um aparelho por vez**. Uso simultâneo em dois aparelhos é raro; não há
  necessidade de tempo real.

## 2. Decisões principais

| Decisão | Escolha | Motivo |
|---|---|---|
| Resolução de conflito | **Por lista, última edição vence** (`updatedAt`) | Simples, suficiente para app pessoal |
| Momento do sync | **Automático sem tempo real**: push com debounce, pull ao abrir/voltar ao app | Uso de um aparelho por vez; economiza cota |
| Granularidade no Firestore | **Um documento por lista**, pull incremental | Custo proporcional às mudanças; sem teto de 1 MB do estado inteiro |
| Fonte de verdade local | `localStorage` continua sendo a fonte de verdade | Offline-first; sync é uma camada opcional |
| Detecção de mudanças | **Diff por hash** contra a última versão sincronizada | Cobre import (que grava direto no storage), duplicação, templates e qualquer `setLists` futuro |
| Carregamento do SDK | `import()` dinâmico | Usuários deslogados não pagam o custo do bundle |
| Logout | Listas locais **permanecem** no aparelho; apaga só `sync-meta` | Os dados são do usuário |
| Troca de conta no mesmo aparelho | `uid` diferente ⇒ tratado como primeiro login (mescla) | Comportamento previsível, sem perda |

## 3. Modelo de dados

### 3.1 Local

**`app` (existente)** — `AppState { lists: List[] }`. Única mudança no tipo:

```ts
export interface List {
  // ...campos atuais
  updatedAt?: number; // epoch ms; ausente ⇒ tratado como 0
}
```

- O `ListsContext` carimba `updatedAt = Date.now()` em **toda mutação** de uma lista (criação,
  update, itens, seções, pessoas, archive, duplicação, templates).
- O import carimba `updatedAt = Date.now()` em todas as listas importadas (import intencional
  vence a nuvem).
- `validateImportData` aceita `updatedAt` opcional numérico.

**`sync-meta` (nova chave, só existe com login)**

```ts
interface SyncMeta {
  uid: string;
  lastPulledAt: number | null;      // maior syncedAt (ms do servidor) já visto; null = nunca puxou
  synced: Record<string, string>;   // listId → hash da última versão sincronizada
  deleted: Record<string, number>;  // listId → momento real da exclusão local (epoch ms)
}
```

Derivações:
- **Lista suja:** `hashList(list) !== meta.synced[list.id]` (inclui listas sem entrada).
- **Lista excluída localmente:** `id ∈ meta.synced` e não existe em `lists` → enviar tombstone.
  O `SyncContext` registra em `deleted` o instante em que a lista some do estado (mesmo offline),
  para que uma exclusão antiga não vença uma edição remota mais nova. Exclusões feitas enquanto
  deslogado não são propagadas (não há `sync-meta`).

### 3.2 Firestore

Caminho: `users/{uid}/lists/{listId}`. Não existe documento `users/{uid}` (nenhum perfil).

```ts
// Lista ativa
{ ...List, updatedAt: number, deleted: false, syncedAt: Timestamp /* serverTimestamp() */ }

// Tombstone (conteúdo removido)
{ id: string, updatedAt: number, deleted: true, syncedAt: Timestamp }
```

- `updatedAt` (relógio do cliente) decide o conflito.
- `syncedAt` (relógio do servidor) é o **cursor do pull** — evita perder atualizações por
  relógio errado no aparelho.
- Campos `undefined` são removidos antes de gravar (Firestore rejeita `undefined`).

### 3.3 Regras de segurança (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/lists/{listId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
                            && request.resource.data.id == listId;
      allow delete: if false; // exclusões são tombstones
    }
  }
}
```

Tudo o mais é negado por padrão.

## 4. Arquitetura

### 4.1 Unidades

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `src/lib/sync/hash.ts` | `hashList(list)`: serialização com chaves ordenadas, ignorando `updatedAt`, + FNV-1a | — |
| `src/lib/sync/merge.ts` | `mergeRemote(local, remoteDocs, meta)` — função pura | `hash` |
| `src/lib/sync/syncMeta.ts` | `loadSyncMeta`, `saveSyncMeta`, `clearSyncMeta` | — |
| `src/lib/sync/types.ts` | `RemoteListDoc`, `RemoteStore`, `AuthProvider`, `SyncStatus` | `types` |
| `src/lib/firebase/config.ts` | Lê `VITE_FIREBASE_*`; `isFirebaseConfigured()` | — |
| `src/lib/firebase/client.ts` | Inicializa app/Auth/Firestore (carregado via `import()`) | SDK `firebase` |
| `src/lib/firebase/firestoreRemote.ts` | Implementa `RemoteStore` (`pullSince`, `push` em `writeBatch` de até 500) | `client` |
| `src/lib/firebase/googleAuth.ts` | Implementa `AuthProvider` (`signIn`, `signOut`, `onChange`) | `client` |
| `src/contexts/SyncContext.tsx` | Orquestra auth, gatilhos, status e ciclo de sync | acima + `ListsContext` |
| `firestore.rules`, `firebase.json` | Regras e config do emulator | — |

`SyncContext` recebe `RemoteStore` e `AuthProvider` por props/factory, permitindo fakes nos testes.

### 4.2 Contratos

```ts
type SyncStatus = 'disabled' | 'signedOut' | 'idle' | 'syncing' | 'offline' | 'error';

interface RemoteListDoc {
  id: string;
  updatedAt: number;
  deleted: boolean;
  syncedAt: number;          // ms
  list?: List;               // ausente em tombstones
}

interface RemoteStore {
  pullSince(uid: string, cursor: number | null): Promise<RemoteListDoc[]>;
  push(uid: string, lists: List[], tombstones: { id: string; deletedAt: number }[]): Promise<void>;
}

interface AuthProvider {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  onChange(cb: (uid: string | null) => void): () => void;
}

interface MergeResult {
  lists: List[];                                    // novo estado local
  toPush: List[];                                   // listas a enviar
  tombstones: { id: string; deletedAt: number }[];  // exclusões a enviar
}
```

`ListsContext` ganha `replaceLists(lists: List[])`, que substitui o estado **sem** carimbar
`updatedAt`.

### 4.3 Regras do merge

Para cada `RemoteListDoc` recebido no pull:

| Local | Remoto | Resultado |
|---|---|---|
| ausente, não em `synced` | ativo | adiciona remoto |
| ausente, não em `synced` | tombstone | ignora |
| ausente, em `synced` (excluída localmente) | ativo com `updatedAt` > exclusão | restaura remoto |
| ausente, em `synced` | ativo com `updatedAt` ≤ exclusão, ou tombstone | mantém excluída (tombstone a enviar se remoto ativo) |
| presente, **limpa** | ativo | aplica remoto |
| presente, **limpa** | tombstone | remove local |
| presente, **suja** | ativo | maior `updatedAt` vence (empate ⇒ local) |
| presente, **suja** | tombstone | local vence se `updatedAt` local > `updatedAt` do tombstone; senão remove |

O "momento da exclusão local" é `meta.deleted[id]`; na ausência, `Date.now()` do ciclo.

Após aplicar o pull: `toPush` = listas locais ainda sujas (incluindo as que venceram o
conflito); `tombstones` = ids em `synced` ausentes localmente e não restaurados.

Primeiro login (`lastPulledAt = null`): pull de tudo; `synced` vazio ⇒ toda lista local é suja
⇒ a tabela acima implementa a mescla "última edição vence".

### 4.4 Ciclo de sync

Execução única por vez (single-flight). Gatilho durante um ciclo marca `pending` e roda de novo ao
final.

1. `remote.pullSince(uid, meta.lastPulledAt)`
2. `mergeRemote(...)`
3. Se o estado mudou: `replaceLists(result.lists)`
4. `remote.push(uid, toPush, tombstones)` (se houver algo)
5. Atualiza `meta.synced` (hash das listas enviadas/recebidas; remove ids de tombstones) e
   `meta.lastPulledAt = max(syncedAt)` visto; `saveSyncMeta`
6. Status `idle`, `lastSyncedAt = Date.now()`

Um ciclo "só push" pula os passos 1–3 (usa `merge` com `remoteDocs = []` para calcular sujas e
exclusões).

### 4.5 Gatilhos

- **Ciclo completo:** login concluído; abertura do app já logado; `visibilitychange → visible`;
  evento `online`; ação "Sincronizar agora".
- **Só push:** debounce de 2 s após mudança em `lists`; **flush imediato** em
  `visibilitychange → hidden` e `pagehide` (iOS encerra PWAs em segundo plano).

### 4.6 Erros

`localStorage` é sempre a fonte de verdade; nenhuma falha perde dados locais.

| Situação | Status | Ação |
|---|---|---|
| `navigator.onLine === false` / `unavailable` | `offline` | tenta no próximo gatilho |
| `permission-denied` / `unauthenticated` | `error` | oferece "Entrar novamente" |
| `resource-exhausted` (cota) | `error` | tenta no próximo gatilho |
| outros | `error` | oferece "Tentar de novo" |
| login cancelado pelo usuário | `signedOut` | nenhuma mensagem |

## 5. Login com Google no iOS (risco)

No PWA standalone do iOS, `signInWithPopup`/`signInWithRedirect` têm problemas conhecidos porque o
`authDomain` (`<projeto>.firebaseapp.com`) é diferente de `senavs.github.io` e o Safari particiona
o storage. Resolução: **spike descartável** (primeira tarefa técnica) num iPhone real com o PWA
instalado:

- **Opção A:** `signInWithPopup(auth, new GoogleAuthProvider())`.
- **Opção B (fallback):** Google Identity Services (botão/One Tap, roda no próprio domínio) →
  ID token → `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`.

O resultado define a implementação de `googleAuth.ts`; o restante do design não muda.

**Resultado do spike (2026-10-15, iPhone):**

| Contexto | A (popup) | C (redirect) |
|---|---|---|
| Safari (aba) | ok | — |
| PWA instalado (standalone) | **falha**: login + MFA concluem, popup fica em loading infinito | **ok** |
| Reabrir o app após login | — | sessão persiste |

**Decisão: opção C — redirect OAuth de página inteira (implicit flow), sem popup.**
- `signIn()` grava `{ state, returnHash }` em `localStorage` (`oauth-pending`) e navega para
  `accounts.google.com/o/oauth2/v2/auth` com `response_type=token`, `scope=openid email`,
  `redirect_uri = https://senavs.github.io/bills-shopping-list/`.
- Na volta, `main.tsx` chama `consumeOAuthRedirect()` **antes** do `HashRouter`: remove o
  fragmento `#access_token=…` da URL, confere o `state` (CSRF), restaura a rota original e guarda o
  token em memória. Erro do Google (ex.: `access_denied`) é tratado como cancelamento silencioso.
- `SyncProvider` carrega o backend na inicialização se houver token pendente; `googleAuth.ts`
  troca o token por sessão com `signInWithCredential(GoogleAuthProvider.credential(null, token))`.
- Exige `VITE_GOOGLE_CLIENT_ID` e as redirect URIs autorizadas no OAuth client (produção e
  `http://localhost:5173/bills-shopping-list/` para dev).

Escopo do OAuth: `openid email` (o Firebase precisa do e-mail para criar o usuário). O app
**nunca lê nem grava** `displayName`, `photoURL` ou `email`. Observação: o Firebase Auth armazena o
e-mail no painel de usuários do projeto; isso é inerente ao provedor e fica fora do Firestore.

## 6. Configuração e segredos

- Variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_APP_ID` ficam em `.env.local` (já ignorado por `*.local`), somente na máquina do
  dono. `.env.example` versionado com nomes e valores vazios.
- Deploy manual como hoje (`npm run deploy`), lendo `.env.local`.
- Sem variáveis ⇒ `isFirebaseConfigured() === false` ⇒ status `disabled`, sem UI de login.
- **Limite conhecido:** a config web do Firebase é embutida no JS do bundle e fica visível no
  branch `gh-pages` (público) e no navegador. Esses valores são identificadores públicos, não
  segredos. A proteção vem de: regras do Firestore, domínios autorizados no Auth, restrição da API
  key por referrer/APIs no Google Cloud e plano Spark sem cobrança. Chaves de service account/Admin
  SDK **nunca** são usadas.

## 7. UI

1. **Item de conta no BottomSheet de ajustes** (primeiro item):
   - Deslogado: "Sincronizar com Google" → `signIn()` + ciclo completo.
   - Logado: "Conectado com Google · sincronizado há X" → abre confirmação com
     "Sincronizar agora" e "Sair" (texto: as listas continuam neste aparelho).
   - Não exibe nome, foto ou e-mail.
   - Oculto quando `disabled`.
2. **Indicador de status** no header do Dashboard, ao lado do `…`, só quando logado: ícones de
   nuvem para `idle`, `syncing`, `offline`, `error`. Tocar em `error` abre o sheet com a ação
   correspondente. Não aparece na tela da lista.
3. **Recomendações:**
   - Após export sem login: aviso curto com botão "Sincronizar".
   - Import com login: aviso na confirmação de que as listas importadas substituem as locais e
     serão enviadas para a nuvem.
   - Banner único e dispensável no Dashboard para quem tem ≥ 3 listas e nunca logou
     (dispensa persistida em `localStorage`, chave `sync-banner-dismissed`).
4. Textos novos em `src/i18n/en.ts` e `src/i18n/ptBR.ts`.

## 8. Testes

| Alvo | Estratégia |
|---|---|
| `hash.ts` | Ordem de chaves irrelevante; `updatedAt` não altera hash; mudança de conteúdo altera |
| `merge.ts` | Casos da tabela 4.3 + propriedades `fast-check`: idempotência, convergência entre dois aparelhos simulados, sem perda de listas exclusivas de um lado, semântica de tombstone |
| `syncMeta.ts` | Leitura/escrita/limpeza; JSON inválido ⇒ `null` |
| `ListsContext` | Mutações carimbam `updatedAt`; `replaceLists` não carimba |
| `importExport` | Import carimba `updatedAt`; validação aceita `updatedAt` |
| `SyncContext` | `RemoteStore` e `AuthProvider` fakes em memória; fake timers: debounce, flush ao ocultar, single-flight com re-run, status offline/erro, logout preserva listas, troca de `uid` |
| UI | Item de conta (deslogado/logado/oculto), indicador de status, banner dispensável |
| Regras | `@firebase/rules-unit-testing` + emulator em `npm run test:rules` (requer Java), fora do `npm test` |

Nenhum teste do `npm test` acessa rede ou o SDK real.

**Checklist manual (iPhone, PWA instalado):** login; primeira mescla com listas locais; editar em
modo avião e voltar online; fechar o app logo após editar; instalar em outro aparelho/limpar dados
e logar; logout mantém listas.

## 9. Fora de escopo

Criptografia dos dados; App Check; sync em tempo real; merge por item; compartilhamento de listas
entre usuários; sincronizar preferências (tema, idioma); exclusão da conta pelo app.
