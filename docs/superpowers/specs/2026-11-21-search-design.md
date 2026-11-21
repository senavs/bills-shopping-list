# Busca de listas e itens — design

## Intenção

Com muitas listas no dashboard, ou muitos itens numa lista, rolar a tela para achar algo fica inviável. O usuário quer buscar e agir em seguida: no dashboard, abrir a lista; dentro da lista, **ir direto para a edição do item**.

## Objetivos / não-objetivos

- Objetivo: achar uma lista pelo nome no dashboard.
- Objetivo: achar um item pelo nome dentro de uma lista e abrir a edição com um toque.
- Não-objetivo: busca global (itens de todas as listas a partir do dashboard).
- Não-objetivo: detectar itens repetidos ao adicionar.
- Anti-objetivo: a busca não pode mudar o que o toque numa linha faz na lista normal (marcar/desmarcar).

## Abordagens consideradas

- **Itens — tela de busca (escolhida).** Um botão 🔍 na barra da lista abre uma tela por cima com o campo focado e os resultados numa lista simples. Tocar num resultado fecha a busca e abre o `ItemForm` de edição. Não interfere nas seções recolhidas nem no modo reordenar.
- **Itens — filtrar no lugar (descartada).** O toque na linha hoje marca o item (`ItemRow.tsx:63`). Para editar com um toque, esse comportamento teria que mudar só durante a busca, o que é inconsistente. Também exigiria abrir seções recolhidas e desligar o reordenar.
- **Dashboard — filtrar no lugar (escolhida).** Tocar numa lista já abre a lista, então filtrar o que está na tela basta.

## Design

### Lógica (`src/lib/search.ts`)

- `normalizeSearch(s)`: converte para minúsculas e remove acentos (NFD + remoção das marcas diacríticas), além de aparar espaços.
- `matchesSearch(text, query)`: diz se o texto normalizado contém a query normalizada. Query vazia casa com tudo.
- Testes unitários: acentos ("pao" casa com "Pão"), maiúsculas, query vazia, query só com espaços.

### Dashboard

- Novo botão 🔍 no header, ao lado do sync e do "…". Ao tocar, aparece um campo de busca (focado) abaixo das abas, dentro do header fixo, com um botão para fechar.
- O filtro vale para a aba atual:
  - Ativas e Arquivadas: filtra `filteredLists` pelo nome.
  - Modelos: filtra "Meus modelos" e "Modelos prontos".
- Se nada casar, mostra "Nenhum resultado para “{query}”" no lugar do estado vazio normal.
- Fechar o campo limpa a busca. *Decisão minha:* trocar de aba mantém o texto digitado.

### Lista — `ItemSearch` (`src/components/ItemSearch/`)

- Botão 🔍 na barra da `ListDetail`, visível quando há itens. Abre `ItemSearch` em tela cheia (fixed, z acima do header), com o campo focado e um "Cancelar".
- Resultados: seguem a ordem visual da lista (seções em ordem, depois "Outros itens"). Cada linha mostra o nome, a seção (ou "Outros itens") e o total formatado na moeda da lista. *Decisão minha:* itens marcados aparecem com um ✓ discreto.
- Tocar num resultado chama `onSelect(item)`. A `ListDetail` fecha a busca e faz `setEditingItem(item)`, reaproveitando o fluxo de edição atual.
- *Decisão minha:* com o campo vazio, a tela mostra todos os itens, funcionando como um índice simples.
- Sem resultados: "Nenhum resultado para “{query}”".
- Funciona também em modelos, que usam o mesmo `ItemForm`.

### Geral

- Novo `SearchIcon` em `src/components/shared/icons.tsx`.
- Chaves i18n em `en.ts` e `ptBR.ts`: `search`, `searchLists`, `searchItems`, `noSearchResults`, `cancel` (se ainda não existir) etc.
- Dark mode com as mesmas classes semânticas usadas hoje (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `bg-fill`).
- Sem mudanças no modelo de dados, no sync ou no `localStorage`.

### Testes

- `search.test.ts` para a lógica.
- `Dashboard.test.tsx`: abrir a busca, filtrar por nome sem acento, ver o estado sem resultados, fechar e ver tudo de novo.
- `ItemSearch.test.tsx`: filtrar, mostrar a seção, chamar `onSelect` ao tocar.
- `ListDetail.test.tsx`: tocar num resultado abre o formulário de edição com o item.

## Fica a cargo de quem implementar

O layout exato do campo, a animação de abrir e fechar, e os nomes finais das chaves i18n.
