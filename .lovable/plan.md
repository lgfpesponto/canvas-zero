

## Problema
O painel de edição das variações (lápis) tem inputs muito pequenos (`text-xs`, `py-0.5`, `w-14`) e o container está limitado a `max-h-60` (~240px), dificultando a edição de nomes e preços.

## Solução
Aumentar o espaço do painel de edição e os inputs para tornar a edição confortável.

### Alterações em `AdminEditableOptions` (src/pages/AdminConfigFichaPage.tsx)

1. **Container do painel de edição** (linha 280): remover `max-h-60` do grid e aumentar o padding do container de `p-3` para `p-4`

2. **Grid de itens** (linha 296): mudar de `grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60` para `grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto` — uma coluna para mais espaço horizontal e altura maior

3. **Inputs de nome** (linha 301): aumentar de `text-xs px-1 py-0.5` para `text-sm px-2 py-1.5` 

4. **Inputs de preço** (linha 303): aumentar de `text-xs w-14 px-1 py-0.5` para `text-sm w-20 px-2 py-1.5`

5. **Cada row de item** (linha 299): aumentar padding de `p-1` para `p-2` e gap de `gap-1` para `gap-2`

6. **Botões de ação** (Salvar/Cancelar, linha 282): aumentar de `text-xs px-2 py-1` para `text-sm px-3 py-1.5`

### Arquivo alterado
- `src/pages/AdminConfigFichaPage.tsx` — apenas classes CSS dentro de `AdminEditableOptions`, sem alterar estrutura do layout

