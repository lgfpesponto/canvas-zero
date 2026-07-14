Adicionar o mesmo botão/modal "Filtros da ficha" que já existe na página Estoque em dois lugares:

1. **Página `/modelos`** (`src/pages/ModelosPage.tsx`) — filtrar os cards de modelos completos.
2. **Diálogo "Modelos Salvos"** (`src/components/template/TemplatesDialog.tsx`) — usado no fluxo Faça seu pedido para escolher um rascunho antes de preencher o pedido.

## O que muda

### Filtros disponíveis
Mesma lista da Estoque (chaves lidas de `form_data` do template, iguais às do `ficha_snapshot`):
- Modelo (`modelo`)
- Tipo Couro Cano (`tipo_couro_cano`)
- Tipo Couro Gáspea (`tipo_couro_gaspea`)
- Solado (`solado`)
- Gênero (`genero`, com fallback para `form_data.genero`)

As opções são derivadas dinamicamente da lista atual de templates — só aparecem valores que existem em pelo menos um modelo, evitando filtros "vazios".

### UI
- Botão `Filtros da ficha` com ícone `Filter` ao lado do campo de busca já existente. Quando houver seleções ativas, mostra um badge com a contagem.
- Modal idêntico ao da Estoque: campo de busca por palavra-chave, blocos por categoria com chips clicáveis (toggle), botões `Limpar` e `Aplicar`.
- Reset de página para 1 sempre que os filtros mudam.

### Comportamento
- Um modelo passa nos filtros quando, para cada categoria com pelo menos um chip ativo, o valor correspondente em `form_data` bate com algum dos chips selecionados (mesma lógica AND-entre-categorias, OR-dentro-da-categoria da Estoque).
- Filtros combinam com a busca por nome e com o filtro Bota/Cinto já existentes na página Modelos.
- No `TemplatesDialog` os filtros combinam com o `search` existente e com a paginação.

## Detalhes técnicos

- Extrair helper `useFichaOptions(items, getSnapshot)` inline em cada tela (ou pequena util em `src/lib/fichaFilterKeys.ts`) para deduplicar `FICHA_FILTER_KEYS` e a montagem do `Record<string, Set<string>>`. Escopo mínimo: só criar o arquivo se ficar mais limpo — caso contrário, replicar as ~15 linhas nos dois componentes (mesma abordagem já usada na Estoque).
- Em `ModelosPage`: usar `m.form_data?.[key]` (com fallback `m.genero` para `genero`). Novo state `selFicha: Record<string, Set<string>>` + `fichaFilterOpen`.
- Em `TemplatesDialog`: adicionar props opcionais? Não — manter tudo interno ao componente, pois `templates: TemplateRow[]` já traz `form_data`. Novo state local `selFicha` + `fichaFilterOpen` + `fichaFilterSearch`.
- Nenhuma alteração em backend, schema ou tipos Supabase.

## Fora de escopo
- Não mexer nas telas de pedido em si (OrderPage/BeltOrderPage/etc.).
- Não persistir os filtros entre sessões (comportamento igual ao da Estoque hoje).
