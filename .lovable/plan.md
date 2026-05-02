## Problema

Quando você está em "Meus Pedidos" (`/acompanhar`) com filtros aplicados, abre o detalhe de um pedido, clica em editar e salva, o app volta para `/pedido/:id` **sem** os parâmetros de filtro na URL. Resultado:

- O hook `useOrderNeighbors` (que monta a sequência prev/next) lê os filtros da URL — sem eles, ele recarrega **toda** a base, então a setinha "próximo" passa a apontar para o pedido errado (não o próximo dentro do filtro).
- Ao voltar para a lista, a página/filtros foram perdidos.

A causa está em três trechos:

1. `OrderDetailPage.tsx` (botão lápis de editar, linha ~584): navega para `/editar` preservando só `?foto=1`, descarta os outros params.
2. `OrderCard.tsx` (botão lápis na lista, linha ~92): navega para `/editar` sem repassar `location.search`.
3. `EditOrderPage.tsx` (linha ~488), `EditExtrasPage.tsx` (~200) e `EditBeltPage.tsx` (~195): após salvar, fazem `navigate('/pedido/'+id+(foto?'?foto=1':''))` — descartam todos os outros params.

O hook `useOrderNeighbors` já lê corretamente `q`, `de`, `ate`, `status`, `vendedor`, `produtos`, `mudou_status`, `mudou_de`, `mudou_ate` da URL — só falta a URL chegar até ele com esses params.

## Mudanças

### 1. Propagar `location.search` ao abrir a edição
- **`src/components/OrderCard.tsx`**: no `onClick` do botão Editar, anexar `location.search` ao `editPath` (mesmo padrão já usado no clique do card).
- **`src/pages/OrderDetailPage.tsx`** (botão lápis ~578-587): preservar todos os params atuais (`location.search`) e apenas garantir/forçar `foto=1` quando o painel está aberto, em vez de substituir tudo.

### 2. Preservar params ao salvar a edição (voltando ao detalhe)
- **`src/pages/EditOrderPage.tsx`** (~488), **`EditExtrasPage.tsx`** (~200), **`EditBeltPage.tsx`** (~195): trocar a navegação atual por algo como:
  ```ts
  const sp = new URLSearchParams(searchParams);
  if (fotoParam) sp.set('foto', '1'); else sp.delete('foto');
  const qs = sp.toString();
  navigate(`/pedido/${id}${qs ? `?${qs}` : ''}`, { replace: true });
  ```
  Como essas páginas já usam `useSearchParams`, basta reaproveitar `searchParams`. Isso mantém `q`, `de`, `ate`, `status`, `vendedor`, `produtos`, `page`, `mudou_*` etc.

### 3. Botão "Voltar" do detalhe
- Verificar o botão "Voltar" do `OrderDetailPage` (caso use `navigate(-1)` já funciona; caso navegue para `/acompanhar` direto, anexar `location.search`). Confirmo no momento da implementação.

## O que NÃO muda
- A lógica de filtros, a paginação, o `useOrderNeighbors`, e os helpers de preço continuam iguais. É só uma correção de propagação de URL.
- O comportamento de "limpar filtro" segue como hoje — só limpa quando o usuário aperta o botão.

## Arquivos a editar
- `src/components/OrderCard.tsx`
- `src/pages/OrderDetailPage.tsx`
- `src/pages/EditOrderPage.tsx`
- `src/pages/EditExtrasPage.tsx`
- `src/pages/EditBeltPage.tsx`

## Resultado esperado
Com filtros aplicados em `/acompanhar`, ao abrir um pedido → editar → salvar:
- Volta para `/pedido/:id?<mesmos filtros>`
- Setinha "próximo/anterior" continua respeitando o filtro
- Ao apertar "Voltar", a lista reaparece com o mesmo filtro e mesma página
- Filtros só somem quando o usuário clicar em "Limpar filtros".
