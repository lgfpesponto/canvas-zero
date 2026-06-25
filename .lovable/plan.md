## Mudanças em `src/pages/EstoquePage.tsx`

### 1. Card do produto (grade)
- **Remover** a linha `<span>` que mostra o SKU dentro de cada chip de tamanho (o `t.sku_base` em fonte mono).
- **Aumentar tamanho/quantidade** nos chips:
  - Número do tamanho: maior e em destaque (ex.: `text-base font-bold`).
  - Quantidade logo abaixo, menor que o tamanho (ex.: `text-[10px]` ou `text-xs text-muted-foreground`).
  - Aumentar `min-w` e padding do chip para acomodar.
- **Aumentar o preço**: passar de `text-sm font-bold` para algo como `text-lg font-bold` (mantendo a cor `text-primary`).
- Não mexer no botão admin de excluir tamanho (continua aparecendo no hover).

### 2. Diálogo "Filtros da ficha"
- Adicionar um `<Input>` de busca no topo do diálogo com placeholder "Buscar filtro...".
- Estado local `filtroBusca` que filtra as opções exibidas em cada categoria (`FICHA_FILTER_KEYS`):
  - Match case-insensitive no valor da opção **ou** no label da categoria.
  - Categorias sem nenhuma opção após o filtro são ocultadas.
- Não alterar a lógica de `selFicha` (seleções permanecem mesmo se a opção sumir da busca).

### 3. Paginação da grade (25 por página)
- Constante `PAGE_SIZE = 25`.
- Novo estado `page` (1-based), resetado para 1 sempre que `filteredGroups`, `search`, `selTamanhos` ou `selFicha` mudarem.
- Derivar `paginatedGroups = filteredGroups.slice((page-1)*25, page*25)` e usar no `.map` da grade.
- Renderizar controles de paginação abaixo da grade quando `totalPages > 1`:
  - Botões "Anterior" / "Próxima" + indicador "Página X de Y" + total de itens.
  - Usar `Button` variant `outline` size `sm`, desabilitando nos extremos.
  - Componente simples inline (sem adicionar dependências); pode usar `Button` + ícones `ChevronLeft`/`ChevronRight` do `lucide-react`.

## Fora de escopo
- Nenhuma mudança em `EstoqueBuyDialog`, RPCs, schema, preview do produto ou outros componentes.
- Lógica de agrupamento, ordenação (com estoque primeiro) e filtros existentes permanece igual.
