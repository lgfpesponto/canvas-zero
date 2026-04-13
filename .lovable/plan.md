

## Problema

O `BootFieldRenderer` (editor de variações dos campos da bota) não possui o botão de relacionamento (`Link2` / 🔗) dentro do modal de edição. Esse botão existe apenas no componente `AdminEditableOptions` (usado pelas categorias clássicas como Bordados, Laser, etc.), mas nunca foi portado para o `BootFieldRenderer`.

## Plano

### 1. Adicionar botão de relacionamento no modal do BootFieldRenderer

No modal de edição de variações (`editDialog`, linhas 1291-1334 de `AdminConfigFichaPage.tsx`), adicionar para cada item:
- Botão `Link2` ao lado dos botões de reordenar/excluir
- Ao clicar, expande um painel inline de relacionamento (igual ao `AdminEditableOptions`)
- O painel mostra as outras categorias/campos da ficha e permite selecionar quais variações são vinculadas

### 2. Lógica de relacionamento

Reutilizar a mesma lógica já existente no `AdminEditableOptions`:
- Estado `relOpen` para controlar qual item está com o painel aberto
- Estado `relCatFilter` para filtro de pesquisa por categoria
- Carregar todas as variações da ficha (`allVariacoes`) para listar como opções
- Carregar todas as categorias para agrupar as opções
- Salvar no campo `relacionamento` (jsonb) da variação via `updateVariacao`

### 3. Props necessárias

O `BootFieldRenderer` precisa receber:
- `allVariacoes` — todas as variações de todas as categorias da ficha (já disponível via `useAllVariacoesByFichaTipo`)
- `allCategorias` — todas as categorias da ficha (já passada como `allCategorias`)

### 4. Itens fallback (não salvos)

Para itens fallback que ainda não estão no banco:
- O botão de relacionamento fica desabilitado ou mostra aviso "(salve primeiro)"
- Só é possível criar relacionamento após persistir o item

### Detalhes técnicos

Arquivo: `src/pages/AdminConfigFichaPage.tsx`

Mudanças no `BootFieldRenderer`:
- Adicionar estados: `relOpen`, `relCatFilter`
- No `editDialog`, adicionar botão `Link2` por item
- Adicionar painel colapsável de relacionamento por item (cópia da lógica das linhas 477-540 do `AdminEditableOptions`)
- Handler `handleSaveRel` para salvar `relacionamento` via `updateVariacao.mutate`

