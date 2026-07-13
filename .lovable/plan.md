## Plano

Ajustar `MultiSelect` (`src/pages/OrderPage.tsx`) e `VariacaoExpandirDialog.tsx`:

### 1. `MultiSelect` (visão normal — imagem 1)
Abaixo do cabeçalho "N selecionados", renderizar linha de chips com os nomes selecionados (mesmo padrão do expandido: pill com nome + X pra remover). Também adicionar botão texto **"limpar"** ao lado do contador que chama `onChange([])`. Chips só aparecem quando `selected.length > 0`.

### 2. `VariacaoExpandirDialog` (visão expandida — imagem 2)
No bloco "N selecionadas" adicionar botão **"limpar"** à direita do badge (mesma linha do contador) que dispara `onToggle(name, false)` pra cada selecionado — ou receber um novo prop opcional `onClearAll` do MultiSelect. Vou adicionar `onClearAll?: () => void` (opcional pra não quebrar outros usos) e, quando ausente, o botão chama `selected.forEach(n => onToggle(n, false))`.

### 3. Sem regressões
- Layout do dropdown normal preservado; chips ficam entre o header e o box com checkboxes.
- Nenhuma outra tela consome `MultiSelect`/`VariacaoExpandirDialog` de forma que quebre com a adição opcional.
- Rodar `tsgo` no final.