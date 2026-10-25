# Listas compartilhadas — Design

- **Data:** 2026-10-25
- **Status:** aprovado
- **Leitura obrigatória antes:** `docs/sync.md` e `docs/superpowers/specs/2026-10-15-google-sync-design.md`

## 1. Objetivo e contexto

Hoje, para dividir a conta no bar, o dono da lista cadastra as pessoas (`List.people`) e é o único que
registra os itens. Se o amigo pede algo, precisa avisar o dono para ele anotar.

**Objetivo:** uma lista **compartilhada**, que um usuário cria e para a qual convida outros. Todos os membros
editam a mesma lista, cada um no próprio celular, e as mudanças aparecem para todos quase em tempo real.

### Decisões do dono do produto

1. Transporte: **Firestore** (o mesmo Firebase do sync atual), sem backend próprio. Continua no plano Spark.
2. **Todos os membros entram com conta Google.** Login anônimo fica fora por enquanto.
3. Um membro convidado **edita tudo** (itens de qualquer pessoa, taxa, pessoas, seções, nome), **mas não exclui a lista**.
4. A lista é **compartilhada desde a criação**. Não existe converter uma lista privada em compartilhada.

### Critérios de sucesso

- A cria uma lista compartilhada, manda o link pelo WhatsApp, B abre o link, entra com Google e vê a lista.
- A e B adicionam itens ao mesmo tempo e nenhum item se perde.
- Uma edição de um aparece no outro em poucos segundos com os dois online.
- Edição offline é aplicada quando a conexão volta.
- Quem nunca usa listas compartilhadas não percebe diferença, e o SDK do Firebase continua fora do bundle principal.

### Não objetivos (MVP)

Login anônimo; tornar uma lista privada compartilhada; remover outros membros; transferir a posse; revogar ou
regenerar o convite; QR code; mostrar quem está online; histórico de "quem editou o quê"; notificações push.

### Anti-objetivos

- Perder itens em edições simultâneas: é a razão de existir da feature.
- Vazar listas pessoais para outros usuários ou para `sharedLists`.
- Gravar dados pessoais (nome, e-mail, foto) dos membros. Membros são só `uid`s, como no sync atual.
- Quebrar o sync pessoal ou dados existentes (`localStorage`, JSON importado, docs em `users/{uid}/lists`).

## 2. Experiência do usuário

### Criar

- Em `/lists/new`, o `ListForm` ganha a opção **"Lista compartilhada"**. Ela só aparece quando o Firebase está
  configurado (`loadBackend !== null`) e não aparece no modo de edição (`/lists/:id/edit`).
- Se o usuário não estiver logado, a opção fica desabilitada, com um botão "Entrar com Google para compartilhar"
  que usa o `signIn` existente. *(Decisão do design: não salvamos rascunho do formulário antes do redirect.)*
- Com a opção marcada, o form pede também **"Seu nome nesta lista"** (obrigatório). Esse nome vira uma `Person`,
  e o criador fica vinculado a ela (`memberPeople[ownerUid]`), para que ele também apareça entre as pessoas.
  *(Decisão do design.)*
- Ao salvar, a lista é criada localmente e no Firestore. O criador é o **dono** (`ownerUid`).

### Pessoas e membros (`PeopleManager`)

Em listas compartilhadas, o `PeopleManager` vira **"Pessoas e membros"**. Ele é o lugar principal para ver e
gerenciar quem está na conta. Nas listas privadas, nada muda.

- Lista **todas** as `people` da lista.
- Uma pessoa vinculada a um membro (está em `memberPeople`) tem um ícone de "no app". A sua tem o rótulo
  **"você"**. As outras são só nomes para a divisão, como hoje.
- Abaixo da lista ficam **"Adicionar pessoa"** (o campo atual) e **"Convidar mais"** (§ Convidar).
- **Sem regras de negócio novas para a divisão.** Quem entra na divisão continua sendo decidido pela seleção
  de pessoas em cada item (`assignedTo`), como hoje. Um membro que não está selecionado em nenhum item não
  aparece na divisão.
- O × continua igual ao de hoje (`removePerson`) para quem é só nome na divisão. A pessoa de um membro **não tem
  ×**, porque removê-la seria remover o membro (fora do MVP) e deixaria `memberPeople` apontando para o nada.
  *(Decisão do design.)*
- O cabeçalho recolhido mostra a contagem de pessoas e um ícone de compartilhado.

### Convidar

- O botão **"Convidar mais"** fica dentro de "Pessoas e membros". O `ListDetail` também mostra um atalho
  "Convidar" perto do título, para não depender de expandir o painel. Os dois abrem `navigator.share` com o
  link de convite e, se a Web Share API não existir, copia o link para a área de transferência com um aviso.
- Formato do link: `https://senavs.github.io/bills-shopping-list/#/join/{listId}?t={inviteToken}`.
- Qualquer membro, não só o dono, pode mandar o convite. O link vale enquanto a lista existir.
- Se a lista foi criada offline, "Convidar" fica desabilitado, com a dica "Aguardando conexão", até o `create`
  chegar ao servidor. O flag `pendingCreate` fica no `shared-sync-meta`. *(Decisão do design.)*

### Entrar (`/join/:listId`)

1. Rota nova `/join/:listId` dentro de `AppWithAds`, com o token lido de `?t=`.
2. Deslogado: tela explicando "Você foi convidado para uma lista compartilhada" + "Entrar com Google". O
   `startOAuthRedirect` já guarda `returnHash`, então depois do login a pessoa volta para o mesmo `#/join/...`.
3. Logado: o app grava o próprio `uid` em `members` provando o token (ver §4). Se o usuário já é membro, só abre a lista.
4. Na primeira entrada na lista, o app pede **"Seu nome nesta lista"** (obrigatório). O app cria uma `Person`
   com esse nome e grava `memberPeople[uid] = personId` numa escrita de membro logo depois da entrada (a regra
   de entrada só permite mudar `members`). **Não existe escolher
   uma pessoa já cadastrada**: cada usuário logado é sempre a própria pessoa, e ninguém se passa por outro.
   O nome do Google **não** é usado (mantém o requisito de privacidade do sync). O campo vem preenchido com o
   último nome usado neste aparelho, guardado no `localStorage`. *(Decisão do design.)*
5. Navega para `/lists/:id`.
6. Erros: o Firestore devolve `permission-denied` para token errado, lista excluída, lista inexistente e limite
   de membros, sem distinguir os casos (quem não é membro não pode ler o doc). Por isso há **uma mensagem
   genérica**, "Convite inválido ou expirado", e uma mensagem separada para falha de rede. *(Decisão do design.)*

### No dia a dia

- A lista compartilhada aparece no Dashboard dos membros com um selo/ícone de "compartilhada" (com `dark:`).
- O uso é idêntico a uma lista comum: adicionar, editar, marcar e dividir.
- Para quem **não é dono**, "Excluir" vira **"Sair da lista"**: remove o próprio `uid` de `members` e apaga a cópia local.
- Se o dono exclui, a lista some para todos. A confirmação do dono diz explicitamente "Excluir para todos os
  membros". Ao receber a exclusão, o cliente remove a cópia local e mostra um aviso.
- "Sair" e "Excluir" feitos offline ou deslogado ficam numa fila de operações pendentes no `shared-sync-meta`
  e são enviados quando houver conexão e login com o mesmo `uid`.
- **Arquivar é por pessoa** e não é sincronizado. O mesmo vale para o estado `collapsed` das seções.

## 3. Modelo de dados

### Local (`src/types/index.ts`)

Um campo novo e opcional em `List`:

```ts
shared?: {
  ownerUid: string
  inviteToken: string
  memberPeople?: Record<string, string> // uid -> personId
}
```

O `id` local é o mesmo id do doc em `sharedLists`. Uma lista é compartilhada se e somente se `shared` existir.
Listas antigas não têm o campo, então nada muda para elas.

Regras de coexistência com o código atual:

- **Sync pessoal:** `SyncContext`/`mergeRemote` precisam **ignorar** listas com `shared`, sem pushar e sem gerar
  tombstone, e preservá-las ao aplicar `replaceLists`. Uma lista compartilhada nunca vai para `users/{uid}/lists`.
- `duplicateList`, `saveAsTemplate` e `createFromTemplate` aplicados a uma lista compartilhada geram uma cópia
  **privada**, sem `shared`. Templates nunca são compartilhados.
- **Export:** exporta a lista compartilhada sem o campo `shared`. **Import** (`Dashboard.applyImport` substitui
  todo o estado `app`):
  - remove `shared` das listas importadas, que entram como privadas;
  - **preserva as listas compartilhadas locais** que já existem, somando-as ao estado importado;
  - dá **id novo** a uma lista importada cujo id coincide com uma lista compartilhada, com itens remapeados como
    em `duplicateList`.

  `validateImportData` aceita o campo `shared` e o ignora. *(Decisão do design.)*
- `List.updatedAt` continua sendo estampado por todas as mutações do `ListsContext`. Os componentes não usam
  nada novo. O sync compartilhado observa as listas e calcula o diff (§5). A única mudança na API do contexto:
  `replaceLists` passa a aceitar também um updater funcional, `replaceLists(prev => next)`, para os dois syncs
  (pessoal e compartilhado) não sobrescreverem um ao outro. Os dois passam a usar a forma funcional.
- **Ordem dos itens:** a ordem que vale é a de `Section.itemIds` dentro de cada seção, e a de `List.items` para
  os itens sem seção. Ao reconstruir a partir do remoto, `List.items` fica agrupado na ordem das seções e depois
  "Outros itens". Nada no app depende da posição global de itens que estão dentro de seções.

### Firestore

```
sharedLists/{listId}
  id, ownerUid, inviteToken
  members: string[]                       // uids, inclui o dono; máx. 10
  memberPeople: { [uid]: personId }
  name, type, currency, taxPercentage
  people:   { [personId]: { name, position } }  // mapa (não array) → updates por campo não conflitam
  sections: { [sectionId]: { name, position } }
  deleted: boolean, updatedAt, syncedAt (serverTimestamp)

sharedLists/{listId}/joins/{uid}
  token: string                           // prova do convite, escrita no mesmo batch da entrada (§4)

sharedLists/{listId}/items/{itemId}
  id, name, quantity, unitPrice, unitType?, selected, includeInTax, assignedTo?
  sectionId: string | null                // pertença à seção mora no ITEM no remoto
  position: number                        // ordem no remoto
  deleted: boolean, updatedAt, syncedAt
```

**Por que o formato remoto difere do local:** no app, a pertença e a ordem vivem em `Section.itemIds` e na
ordem de `List.items`. Se isso fosse um array no doc pai, dois membros adicionando itens à mesma seção ao mesmo
tempo se sobrescreveriam. No remoto, cada item carrega `sectionId` + `position` (ordem dentro do grupo da sua seção ou de "Outros itens"), e `people`/`sections` são mapas
atualizados por caminho de campo (`people.<id>`). O cliente converte nos dois sentidos com funções puras em
`src/lib/sharedSync/` (`toRemote` / `fromRemote`): reconstrói `items` ordenados por `position` e
`Section.itemIds` a partir de `sectionId`. Seções são ordenadas por `position`.

`position`: número. Ao reordenar, só o item movido recebe um valor novo entre os vizinhos (fração). Quando a
precisão se esgota, o cliente renormaliza as posições do grupo. As últimas posições remotas conhecidas de
itens, seções e pessoas ficam no `shared-sync-meta` (§5), para o cliente calcular o valor entre os vizinhos. *(Fica para o builder decidir a técnica exata.)*

Exclusões de item, pessoa e seção: item → tombstone (`deleted: true`, sem apagar o doc), para um cliente offline
não ressuscitar o item. Pessoa e seção → `deleteField()` no mapa. Excluir uma seção não exclui os itens:
os clientes tratam `sectionId` órfão como "Outros itens", igual ao comportamento local. Excluir uma pessoa remove
o id dela dos `assignedTo` (mesma regra do `removePerson` local). Pessoas vinculadas em `memberPeople` não são
removíveis pela UI (§2).

## 4. Regras do Firestore (`firestore.rules`)

Sem mudança nas regras de `users/{uid}/lists`. Novas regras, todas com `request.auth != null`:

- **`sharedLists/{listId}`**
  - `get`: se `uid in resource.data.members`. **`list`**: só queries com `members array-contains uid`.
  - `create`: `ownerUid == uid`, `members == [uid]`, `id == listId`, `deleted == false`, `inviteToken` é string com 20+ caracteres.
  - `update` por **membro**: pode mudar qualquer campo, **exceto** `id`, `ownerUid`, `inviteToken`, `members`;
    `deleted` só pode virar `true` se `uid == ownerUid`; em `memberPeople`, só a chave do próprio `uid` pode
    mudar (ninguém se vincula à pessoa de outro membro).
  - `update` de **entrada** (não membro): feita num **batch** com a criação de `joins/{uid}`.
    `affectedKeys` só `members`; `members` novo == antigo + `[uid]`; tamanho ≤ 10; `deleted == false`; e
    `getAfter(/sharedLists/{listId}/joins/{uid}).data.token == resource.data.inviteToken`.
    As regras leem `resource.data` mesmo quando o usuário não pode ler o doc.
    **Não usar um campo `joinToken` no doc pai:** `request.resource.data` é o doc inteiro depois da escrita, então
    um token gravado por um convidado anterior continuaria lá e liberaria a entrada de qualquer um que soubesse o
    `listId`.
  - `update` de **saída** (membro não dono): `affectedKeys` só `members` e `memberPeople`;
    `members` novo == antigo − `[uid]`. Em `memberPeople`, só pode sumir a chave `uid` do próprio usuário
    (as outras ficam iguais). O dono não pode sair; só excluir.
- **`sharedLists/{listId}/joins/{uid}`**: `create` e `update` só pelo próprio `uid` (`request.auth.uid == uid`);
  `read` só pelo próprio `uid`; `delete` nunca. A entrada só vale se o token gravado for igual ao `inviteToken`,
  e quem garante isso é a regra de entrada acima.
- **`sharedLists/{listId}/items/{itemId}`**
  - `read`, `create`, `update`: se `uid in get(/sharedLists/{listId}).data.members` e o pai não está `deleted`; `id == itemId`.
  - `delete`: nunca.
- Testes em `npm run test:rules` cobrindo: não membro não lê; entrada com token certo/errado; **depois que um
  convidado entrou, um estranho sem token continua sem conseguir entrar**; não dá para adicionar outra pessoa
  a `members`; quem sai não apaga o `memberPeople` dos outros; convidado não exclui a lista nem muda `ownerUid`/`inviteToken`;
  saída só remove a si mesmo; limite de 10.
- Lembrete de deploy: `firebase deploy --only firestore:rules --project prod-billbuddy`.

`inviteToken`: `crypto.randomUUID()`. Membros conseguem ler o token, o que é aceitável porque eles já podem
compartilhar o link.

## 5. Sincronização das listas compartilhadas

Um caminho de sync separado do pessoal, com a mesma filosofia: `localStorage` é a fonte de verdade e o remoto
é uma réplica.

- **Onde:** lógica pura em `src/lib/sharedSync/` (conversão, diff, merge, meta). O adaptador do SDK fica em
  `src/lib/firebase/sharedRemote.ts`, carregado via `loadBackend` (o `SyncBackend` ganha `shared`).
  Orquestração dentro de `SyncContext` ou num `SharedSyncContext` irmão (a escolha é do builder). O SDK continua lazy.
- **Interface remota** (para ter um `memorySharedRemote` em testes, sem o SDK real): `create`, `join`, `leave`,
  `deleteList`, `pushChanges(listId, parentPatch, itemWrites)`, `subscribeLists(uid, cb)`,
  `subscribeItems(listId, cb)` → unsubscribe.
- **Tempo real:** enquanto logado, o app fica inscrito (`onSnapshot`) na query de pais
  `members array-contains uid` e nos `items` de cada lista compartilhada **não arquivada** localmente.
  Listas arquivadas são puxadas uma vez ao desarquivar.
- **Detecção de mudança local:** hashes guardados em uma chave nova de `localStorage`, `shared-sync-meta`:

  ```ts
  {
    uid,
    lists: { [listId]: {
      pendingCreate?: true,
      fields:   { [field]: hash },                       // name, type, currency, taxPercentage, memberPeople
      people:   { [personId]: { hash, position } },
      sections: { [sectionId]: { hash, position } },
      items:    { [itemId]: { hash, position, sectionId } },
    } },
    pendingOps: Array<{ kind: 'leave' | 'delete', listId }>,
  }
  ```

  Cada campo do pai, cada pessoa e cada seção tem seu próprio hash, para o merge do pai ser por campo.
  Quando o `ListsContext` muda uma lista compartilhada, o diff contra o meta gera só as escritas necessárias:
  itens novos/alterados → `set` do doc do item; item que sumiu → tombstone; campos do pai alterados → `update`
  por caminho de campo. Push com debounce (~1 s, mais curto que o pessoal) e flush em `visibilitychange`/`pagehide`.
  Escritas offline são reenviadas quando a conexão volta.
- **Merge de snapshot remoto, por item:** se o item local está limpo (hash == meta), aplica o remoto. Se está
  sujo, mantém o local e o próximo push sobrescreve (na prática, vence a última escrita no servidor). Item que
  não existe localmente é adicionado. Tombstone remoto remove o item local, a não ser que ele esteja sujo.
  Campos do pai: mesma regra, por campo. Campos só locais (`archived`, `collapsed` das seções) nunca são
  sobrescritos. Aplicar o remoto usa `replaceLists` (sem estampar `updatedAt`).
- **Pai com `deleted: true`** ou usuário fora de `members` (ex.: saiu em outro aparelho): remove a cópia local e
  mostra um aviso.
- **Lista compartilhada que some do local sem "Sair" ou "Excluir"** (storage limpo, import, troca de usuário)
  **nunca gera escrita destrutiva**. Só as ações explícitas entram em `pendingOps`. Se o usuário ainda é membro,
  o listener baixa a lista de novo. *(Decisão do design.)*
- **Sign-out:** as cópias locais das listas compartilhadas continuam no aparelho, mas o sync para. O Dashboard e
  o `ListDetail` mostram "Entre para sincronizar esta lista compartilhada". Edições feitas deslogado são enviadas
  ao logar de novo, se for o mesmo `uid`. Com outro `uid`, as cópias de quem não é membro são descartadas.
  Uma sessão expirada (erro `auth`, `uid` vira `null` sem sign-out explícito) é tratada igual: o
  `shared-sync-meta` e as edições pendentes são mantidos. *(Decisão do design.)*
- **Status:** o `SyncStatusButton` existente reflete também o sync compartilhado (`syncing`, `offline`, `error`).

## 6. i18n, dark mode, testes

- Toda string nova passa por `useLanguage().t`, com chaves em `en.ts` e `ptBR.ts`: opção do form, "Seu nome nesta lista", "Pessoas e membros", "você", "Convidar mais", botão Convidar,
  texto do share, telas de join e de nome, erros, "Sair da lista", selo, avisos.
- Toda UI nova tem `dark:`.
- Testes Vitest:
  - funções puras de `src/lib/sharedSync/` (conversão ida e volta preservando ordem e seções, diff, merge por item,
    incluindo dois "clientes" adicionando itens à mesma seção sem perda);
  - fluxo em `SyncContext` com `memorySharedRemote` e auth fake;
  - componentes (`ListForm` com a opção e o nome do criador, join pedindo o nome e criando a `Person` vinculada, `PeopleManager` em lista compartilhada com membros, "você", "Convidar mais" e sem × na pessoa de um membro, "Sair da lista");
  - sync pessoal ignorando listas `shared`;
  - import removendo `shared`; `duplicateList` de lista compartilhada gerando cópia privada.
- Testes de regras em `npm run test:rules` (§4).

## 7. Deixado para o builder

- Se a orquestração fica no `SyncContext` ou num contexto novo.
- Técnica exata de `position` (fração vs. inteiro com renormalização).
- Componentes exatos e visual do selo, do atalho "Convidar", de "Pessoas e membros" e da tela de nome no join.
- Debounce exato e estratégia de reconexão dos listeners.
- Ordem de implementação (sugestão: modelo + conversões puras → regras + testes de regras → remote/memória →
  orquestração → UI de criar/convidar/entrar → sair/excluir → polimento).
