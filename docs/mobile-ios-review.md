# Revisão de front-end — BillBuddy (foco mobile / iOS)

> Data: 2026-10-14 · Escopo: `index.html`, `vite.config.ts`, `src/index.css` e todos os componentes em `src/components/`.
> Contexto de uso: pessoa no supermercado ou no restaurante, com o iPhone numa mão e muitas vezes um carrinho ou cardápio na outra. Uso rápido, com uma mão só, muitas vezes como PWA instalado na tela inicial.

## Resumo executivo

O app já tem uma boa base para iOS: `viewport-fit=cover`, `pt-safe` nos headers, `inputMode="decimal"` no formulário de item, bottom sheets, scroll lock compatível com iOS e alvos de toque de 44px em vários lugares. Os problemas mais sérios estão em três frentes:

1. **Safe area inferior quebrada** em tudo que é `position: fixed` (TotalsBar, FABs, BottomSheet, toast). No PWA instalado em iPhones com Face ID, o indicador de início fica por cima do conteúdo.
2. **Teclado do iOS e formulários**: zoom automático em input com fonte < 16px, modais com `90vh` que não encolhem quando o teclado abre, botão de salvar escondido atrás do teclado.
3. **Ergonomia de uma mão e densidade**: a ação mais comum (marcar item) tem alvo pequeno, excluir item exige confirmação *e* mostra desfazer, a barra de totais espreme 4 valores em ~215px.

Na parte visual, o app usa a paleta padrão do Tailwind (cinza + azul `#3b82f6`) e emojis como ícones. Funciona, mas não tem identidade e não parece nativo do iOS. A seção 5 propõe uma direção visual.

Prioridades: **P0** = bug visível no iPhone · **P1** = atrito real de uso · **P2** = polimento/identidade.

---

## 1. Safe areas e layout fixo (P0)

### 1.1 `pb-safe` não existe
`src/components/shared/BottomSheet.tsx:94` usa `pb-safe`, mas `src/index.css` só define `.pt-safe`. A classe não gera nada. O sheet compensa com um `<div className="h-6" />` fixo (24px), menor que os 34px do indicador de início, então o último item ("Excluir") fica colado no indicador.

```css
/* src/index.css — @layer utilities */
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.mb-safe { margin-bottom: env(safe-area-inset-bottom); }
.bottom-safe { bottom: env(safe-area-inset-bottom); }
```
Depois disso, remova o `h-6` e use `pb-[max(1rem,env(safe-area-inset-bottom))]` no sheet.

### 1.2 Elementos fixos ignoram o `padding-bottom` do body
O `body { padding-bottom: env(safe-area-inset-bottom) }` não afeta elementos `fixed`. Afetados:

| Componente | Linha | Problema |
|---|---|---|
| `TotalsBar` | `TotalsBar.tsx:19` | `bottom-0` sem padding inferior: o total fica sob o indicador de início |
| FABs da lista | `ListDetail.tsx:271` | `bottom-2`: o botão "+" encosta no indicador |
| FAB do dashboard | `Dashboard.tsx:237` | `bottom-6 right-6` sem safe area |
| `UndoToast` | `UndoToast.tsx:34` | `bottom-20` (80px) fica **por cima** da TotalsBar, que tem ~100px de altura no mobile (grid 2×2) |
| Botão de idioma da Landing | `Landing.tsx:46` | `fixed top-4`: no PWA fica sob a Dynamic Island |

Sugestão: defina uma variável CSS com a altura da TotalsBar e derive tudo dela.

```css
:root { --totals-h: 72px; }
.totals-bar { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
.toast-above-totals { bottom: calc(var(--totals-h) + env(safe-area-inset-bottom) + 12px); }
```

### 1.3 `min-h-screen` = `100vh`
No Safari iOS, `100vh` é a altura com a barra de endereço **recolhida**, então o conteúdo transborda. O Tailwind 3.4 (já instalado) tem `min-h-dvh` / `max-h-dvh`. Troque `min-h-screen` por `min-h-dvh` e `max-h-[90vh]` por `max-h-[90dvh]` nos modais (`ItemForm.tsx:76`, `SplitModal.tsx`).

### 1.4 Margens laterais em paisagem
O `body` recebe `padding-left/right` de safe area, mas os elementos `fixed` (TotalsBar, FABs) não herdam. Em paisagem, o "+" fica sob o notch/ilha. Use `right: max(1rem, env(safe-area-inset-right))`.

---

## 2. Teclado e formulários no iOS (P0/P1)

### 2.1 Zoom automático ao focar (P0)
O Safari iOS dá zoom em qualquer `input`/`select` com `font-size < 16px`. Ocorrências:
- `PeopleManager.tsx` input "Adicionar pessoa": `text-sm` (14px) → **zoom garantido**.
- Revise também os selects. Regra segura:

```css
@layer base {
  input, select, textarea { font-size: max(16px, 1em); }
}
```
**Não** resolva com `maximum-scale=1` no viewport, porque isso quebra o zoom de acessibilidade.

### 2.2 Modal de item com o teclado aberto (P1)
`ItemForm` é um bottom sheet com `max-h-[90vh]` e os botões **no fim** do formulário. Com o teclado aberto (~300px), "Adicionar" fica fora da tela e exige rolar dentro do modal.

Sugestão, no padrão de sheet do iOS:
- Header fixo do sheet com **Cancelar** (esquerda), título (centro) e **Adicionar** (direita, em negrito).
- Use `max-h-[calc(100dvh-env(safe-area-inset-top)-16px)]` ou ajuste via `window.visualViewport` (evento `resize`) para acompanhar o teclado.
- `autoFocus` no campo Nome quando abrir pelo "+" (no iOS funciona porque a abertura vem de um gesto do usuário).

### 2.3 Atributos de teclado
| Campo | Hoje | Sugerido |
|---|---|---|
| Nome do item | `type="text"` | `autoCapitalize="sentences" autoComplete="off" enterKeyHint="next"` |
| Quantidade | `inputMode="decimal"` ✅ | + `enterKeyHint="next"` |
| Preço unitário | valor inicial `'0'` | começar **vazio** com `placeholder="0,00"`, porque hoje a pessoa precisa apagar o 0 antes de digitar; `enterKeyHint="done"` |
| Taxa % (`ListForm`) | `type="number"` + `parseFloat` | `type="text" inputMode="decimal"` + `parseLocaleNumber`, como no ItemForm. Hoje "10,5" no teclado pt-BR falha ou é truncado |
| Adicionar pessoa | — | `enterKeyHint="done" autoCapitalize="words"` |

### 2.4 Grid de 3 colunas no formulário de item
`grid-cols-3 gap-4` com `px-4` em cada input deixa ~95px por campo num iPhone de 375pt. Valores como "1.234,56" ficam cortados. Sugestão: **Quantidade + Unidade** na mesma linha (unidade como segmented control `un | kg | g | L`) e **Preço** sozinho em largura total, com fonte maior. O preço é o dado mais importante do formulário.

### 2.5 Checkboxes minúsculos
"Incluir na taxa" e "Selecionado" usam `w-4 h-4` (16px) e o label não ocupa a linha toda. Transforme cada um em uma linha de 44pt inteira tocável, com um switch no estilo iOS à direita. No Safari 17.4+ existe `<input type="checkbox" switch>`, que renderiza o switch nativo e ainda dá **feedback háptico**.

---

## 3. Interação e ergonomia (P1)

### 3.1 Marcar item é a ação nº 1, e o alvo é pequeno
No mercado, a ação repetida é "peguei, marca". Hoje o checkbox nativo tem 20px dentro de um label de 36px (`ItemRow.tsx:67`), e tocar no resto da linha não faz nada.
- **Toque na linha inteira = alternar selecionado.** Editar fica no menu "⋯" ou num toque no preço.
- Checkbox customizado grande (28px dentro de uma área de 44px), com animação de check curta.
- Opcional: no iOS 18+, o truque do `<input switch>` oculto dispara háptico ao marcar.

### 3.2 Excluir item: confirmação **e** desfazer
`ItemRow` abre `ConfirmDialog` e, depois de confirmar, `ListDetail` ainda mostra o `UndoToast`. São dois mecanismos para o mesmo risco. O padrão iOS é **swipe-to-delete sem confirmação + desfazer**. Remova o `ConfirmDialog` de item e mantenha só o toast. Mantenha a confirmação para excluir **lista** e **seção**, onde perder dados é mais grave.

Bônus: swipe para a esquerda na linha revela "Excluir" (vermelho) e "Duplicar". É o gesto que usuários de iPhone esperam em listas.

### 3.3 Drag handle sempre visível
Cada linha gasta 32px com o handle `⋮⋮`, sendo que reordenar é raro. Sugestões:
- Esconder handles por padrão e ter um botão **"Organizar"** no header que entra em modo edição (como no app Lembretes).
- Ou, já que o `TouchSensor` usa `delay: 200`, permitir long-press na linha inteira para arrastar e dispensar o handle.

### 3.4 Long-press no card de lista conflita com o Safari
`ListCard` usa `useLongPress` sobre um `<Link>`. No Safari iOS, long-press em link abre a **prévia nativa do link**, que compete com o seu bottom sheet. O `onContextMenu` não impede isso. Adicione no card:

```css
.no-callout { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
```

### 3.5 Barra de totais densa demais
4 valores num grid 2×2, com `pr-32` reservado para os FABs, deixam ~215px úteis em 375pt. "Subtotal", "Taxa", "Selecionado" e "Total" competem com o mesmo peso.

Proposta:
- **Uma linha principal**: o número que importa naquele contexto, grande e com `tabular-nums`. No mercado é o "no carrinho" (selecionado); no restaurante é o "total com taxa".
- Os outros valores ficam numa linha secundária menor, ou num sheet que abre ao tocar na barra (padrão "mini player" do Apple Music).
- Coloque o "+" **dentro** da barra, à direita, em vez de flutuando sobre ela. Isso libera o `pr-32` e resolve o empilhamento FAB-sobre-barra.

### 3.6 FAB "☰" para nova seção
O glifo ☰ significa "menu" para qualquer usuário, não "nova seção". Mova "Nova seção" para o menu "⋯" do header da lista ou para um botão de texto ao fim da lista ("+ Nova seção") e deixe um único FAB.

### 3.7 Header do dashboard sobrecarregado
Título + 4 botões redondos de 48px (🇧🇷, 🌙, 🏠, ⋮) num iPhone de 375pt deixam ~110px para "BillBuddy". Idioma, tema, landing, exportar e importar são configurações raras. Agrupe tudo em um único botão "⋯" ou "Ajustes" (sheet) e use um título grande no estilo iOS (*large title* de 34pt que encolhe ao rolar).

### 3.8 Abas com cores semânticas erradas
Ativas = azul, Arquivadas = **vermelho**, Modelos = verde. Vermelho comunica erro/perigo, e arquivar não é nenhum dos dois. O card arquivado também ganha `border-red-500`. Use um segmented control nativo (`Ativas | Arquivadas | Modelos`) numa única cor.

### 3.9 Outros pontos de interação
- `PeopleManager`: toggle com `▶/▼` em texto pequeno, sem área de toque de 44pt.
- `SplitModal`: botão fechar "×" sem tamanho mínimo; arrastar para baixo não fecha (o BottomSheet já tem essa lógica, dá para reaproveitar).
- `BottomSheet`: durante o arraste, `transition-transform duration-200` continua ativo e o sheet "atrasa" atrás do dedo. Desligue a transição enquanto `isDraggingRef` for `true`.
- `UndoToast`: `setInterval` de 50ms re-renderiza 100× em 5s só para a barra de progresso. Use uma animação CSS `@keyframes shrink { from { width:100% } to { width:0 } }` e um único `setTimeout`.
- Card de lista mostra o total **sem taxa** (`ListCard.tsx`), diferente do "Total" da barra. Escolha um e rotule.

---

## 4. PWA, performance e plataforma (P1/P2)

### 4.1 Script do AdSense carregado com anúncios desligados
`index.html` carrega `adsbygoogle.js` em todas as páginas, mas `ADS_ENABLED = false`. É uma requisição de terceiros com cookies, pesa no primeiro carregamento em 4G e roda até na Landing. Injete o script dinamicamente só quando `ADS_ENABLED && navigator.onLine`.

### 4.2 Splash e cores de tema
- O comentário "Splash screens for iOS" não tem nenhum `apple-touch-startup-image`. Sem isso, o iOS mostra uma tela branca ao abrir o PWA, que fica bem visível em dark mode.
- `manifest.background_color: '#ffffff'` e `theme-color: #3b82f6` são fixos. Adicione:
  ```html
  <meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  ```
- Com `black-translucent`, o texto da status bar é sempre branco. No tema claro, a hora e a bateria ficam brancas sobre `gray-50`, ou seja, **invisíveis**. Ou use `default`, ou mantenha `black-translucent` e garanta um fundo escuro atrás da status bar.

### 4.3 Dark mode ignora o sistema
`DarkModeContext` começa em `false` e nunca consulta `prefers-color-scheme`. Usuários de iPhone com aparência automática abrem o app claro à noite. Sugestão: três estados `Sistema | Claro | Escuro`, com padrão em **Sistema** e escuta de `matchMedia('(prefers-color-scheme: dark)')`. Adicione também um script inline no `<head>` para aplicar a classe `dark` antes do React montar, para evitar o flash branco.

### 4.4 Exportar/Importar no PWA iOS
- `exportData` usa `<a download>` com blob URL. No modo standalone do iOS isso costuma abrir um visualizador sem como voltar, ou não fazer nada. Prefira `navigator.share({ files: [new File([json], name, { type: 'application/json' })] })` quando `navigator.canShare` existir (abre o share sheet nativo: "Salvar em Arquivos", AirDrop, WhatsApp) e use o download como fallback.
- `accept=".json"`: o seletor do iOS às vezes deixa `.json` cinza. Use `accept="application/json,.json"`.

### 4.5 Transição global em `*`
`index.css` aplica `transition` de cor em **todos** os elementos, e depois tenta desfazer com `[class*="transition-"] { transition-property: revert }`. Em listas longas no iPhone isso custa repaint, e o hack de `revert` anula transições legítimas de forma imprevisível. Limite a transição ao `body` e às superfícies principais, ou use `@media (prefers-color-scheme)` com `color-scheme: light dark` e deixe sem transição.

### 4.6 Acessibilidade de movimento e toque
- Não há `@media (prefers-reduced-motion: reduce)`. O `animate-bounce-slow` infinito e os `.reveal` da Landing devem ser desligados nesse caso.
- Adicione `-webkit-tap-highlight-color: transparent` e estados `:active` explícitos (hoje o código depende muito de `hover:`, que não existe no toque e "gruda" no iOS). Use `@media (hover: hover)` para os hovers.
- Modais sem `role="dialog"`, `aria-modal="true"` e retorno de foco. O VoiceOver continua lendo a página por trás.

### 4.7 Strings não traduzidas
Textos fixos em inglês num app com i18n: `"... deleted"` (`ListDetail.tsx:295`), `"Template"` (badge), `"View Split"`, `"Edit list"`, `"Drag to reorder"`, `"Item options"`, `"Section options"`, `"Expand/Collapse section"`, `"Close"`, `"Light mode"/"Dark mode"`, `"Home"`, `"Ad Space"`. O VoiceOver em pt-BR lê esses `aria-label` em inglês com sotaque.

---

## 5. Direção visual (P2)

O app hoje é "Tailwind padrão": cinza neutro, azul `#3b82f6`, cards brancos com `shadow-sm`, emojis como ícones e títulos de seção em CAIXA ALTA espaçada. Funciona, mas não parece um app de iPhone nem tem cara própria.

### Conceito: "etiqueta de preço"
O assunto do app é preço na gôndola e conta na mesa. O elemento mais característico desse mundo é a **etiqueta amarela de preço** do supermercado. A proposta é gastar a ousadia num único lugar, o número do total, e deixar o resto quieto e nativo.

**Paleta**

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | fundo agrupado (o mesmo do iOS) |
| `--surface` | `#FFFFFF` | `#1C1C1E` | linhas/cards |
| `--ink` | `#1C1C1E` | `#F2F2F7` | texto |
| `--muted` | `#6C6C70` | `#98989F` | texto secundário (contraste AA) |
| `--accent` | `#1E6B4E` | `#4CC38A` | verde-feira: ações, checks |
| `--tag` | `#FFD60A` | `#FFD60A` | **só** o total em destaque, como etiqueta de preço com texto `--ink` |

O vermelho fica reservado para ações destrutivas. O azul do Tailwind sai.

**Tipografia**
- Use a fonte do sistema (SF Pro) explicitamente: `font-family: -apple-system, system-ui, sans-serif`. É o que faz o app parecer nativo.
- **Números em `ui-rounded`** (SF Pro Rounded, disponível no Safari) com `font-variant-numeric: tabular-nums`. Os preços alinham em coluna, os dígitos não "dançam" enquanto o total muda, e a forma arredondada dá personalidade sem sair do iOS.
- Escala: 34 (large title) / 22 (total) / 17 (corpo, o padrão do iOS) / 15 (secundário) / 13 (legendas). O corpo hoje está em 16px/14px; 17px é o padrão do iOS e melhora a leitura no mercado.
- Troque os títulos de seção em `uppercase tracking-wide` (`SectionBlock.tsx:106`, `ListDetail.tsx:245`, `BottomSheet.tsx:87`) por *sentence case* em 15pt semibold, como os headers de lista do Ajustes.

**Layout**
- Trocar os cards soltos (`rounded-xl shadow-sm` em cada item) por **listas agrupadas inset** no estilo iOS: um bloco branco com cantos de 10pt por seção e separadores de 0,5px entre as linhas. Fica mais denso, cabem mais itens na tela e parece nativo.
- Linha do item: `[✓ 28pt] Nome ............ R$ 12,90` com uma segunda linha em `--muted` (`2 un × R$ 6,45`). Hoje o cálculo inteiro `2 × R$ 6,45 = R$ 12,90` fica numa linha só em semibold e compete com o nome.
- Barra de totais como "etiqueta": fundo `--tag` só no valor principal, com o resto da barra em material translúcido (`backdrop-blur`) como a tab bar do iOS.

```
┌───────────────────────────────────────┐
│ ‹ Listas                     ⋯        │
│ Mercado sábado                        │  ← large title 34pt
│ 🛒 Compras · R$                        │
├───────────────────────────────────────┤
│ Hortifruti                       3    │  ← header de seção 15pt
│ ┌───────────────────────────────────┐ │
│ │ ◉ Banana prata         R$ 7,98    │ │
│ │   2 kg × R$ 3,99                  │ │
│ │───────────────────────────────────│ │
│ │ ○ Tomate               R$ 5,40    │ │
│ └───────────────────────────────────┘ │
│ + Nova seção                          │
├───────────────────────────────────────┤
│ No carrinho  ▐ R$ 13,38 ▌       (+)   │  ← etiqueta amarela + FAB na barra
│ Total c/ taxa R$ 48,10                │
└───────────── safe area ───────────────┘
```

**Ícones**: troque os emojis de ação (✏️ 📋 🗑️ 📦 📤 📌) por um conjunto SVG consistente (SF Symbols-like, por exemplo Lucide ou Heroicons, que já aparecem nos SVGs inline). Emojis renderizam em tamanhos e alinhamentos diferentes e destoam no dark mode. Mantenha os emojis só como "avatar" do tipo de lista (🛒 🍽️ 🍻), onde têm personalidade.

**Movimento**: um único momento marcante, quando um item é marcado (check que "carimba" e o valor da etiqueta faz um *tick* numérico). Todo o resto sem animação gratuita. Respeite `prefers-reduced-motion`.

---

## 6. Plano sugerido

| Ordem | Item | Esforço | Arquivos |
|---|---|---|---|
| 1 | Utilitários de safe area + aplicar em TotalsBar, FABs, sheet, toast, Landing | P | `index.css`, `TotalsBar`, `ListDetail`, `Dashboard`, `BottomSheet`, `UndoToast`, `Landing` |
| 2 | `font-size ≥ 16px` em inputs, `dvh` nos modais | P | `index.css`, `ItemForm`, `SplitModal`, telas com `min-h-screen` |
| 3 | Status bar legível no tema claro + `theme-color` por esquema + remover AdSense quando desligado | P | `index.html` |
| 4 | Dark mode "Sistema" + script anti-flash | P | `DarkModeContext`, `index.html` |
| 5 | ItemForm: header Cancelar/Adicionar, preço vazio, `enterKeyHint`, layout 2 linhas, switches | M | `ItemForm` |
| 6 | Toque na linha marca o item; remover confirmação de exclusão de item | P | `ItemRow` |
| 7 | `-webkit-touch-callout: none` no ListCard | P | `ListCard` |
| 8 | Taxa com `inputMode="decimal"` + `parseLocaleNumber` | P | `ListForm` |
| 9 | Exportar via Web Share API | P | `importExport.ts`, `Dashboard` |
| 10 | Redesenho da TotalsBar (valor principal + detalhe, "+" integrado) | M | `TotalsBar`, `ListDetail` |
| 11 | Header do dashboard: agrupar ajustes, large title, segmented control | M | `Dashboard` |
| 12 | Strings i18n faltantes + `role="dialog"` nos modais | P | vários |
| 13 | Swipe-to-delete e modo "Organizar" para os handles | G | `ItemRow`, `SortableContainer` |
| 14 | Direção visual (tokens, tipografia, listas agrupadas, ícones SVG) | G | `tailwind.config.js`, `index.css`, todos os componentes |

P = pequeno (< 1h) · M = médio (meio dia) · G = grande (1–3 dias)

Os itens 1 a 4 sozinhos resolvem tudo que hoje está visivelmente quebrado num iPhone com o app instalado.
