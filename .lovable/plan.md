## Objetivo

Fazer as setas Anterior/Próximo dentro do detalhe do pedido (`/pedido/:id`) navegarem **respeitando os filtros** atualmente aplicados em "Meus Pedidos", em vez de varrer todos os pedidos do usuário/admin.

## Problema atual

`useOrderNeighbors` busca **todos** os pedidos visíveis ao usuário (admin = todos; vendedor = próprios), ordenados por `created_at desc`. Se o usuário filtrou por status "Em produção" e clicou no 3º pedido da lista, as setas saltam para pedidos fora do filtro — perdendo o contexto da listagem.

Os filtros já estão **persistidos na URL** de `/relatorios` (`?q=`, `?de=`, `?ate=`, `?status=`, `?vendedor=`, `?produtos=`, `?mudou_status=`, `?mudou_de=`, `?mudou_ate=`).

## Solução

Propagar os filtros da URL de `/relatorios` para `/pedido/:id` via querystring e usá-los em `useOrderNeighbors` para construir a sequência correta de IDs.

### 1. Ao abrir um pedido a partir da listagem, anexar os filtros

`src/components/OrderCard.tsx` (linha 34) — em vez de `navigate(\`/pedido/${order.id}\`)`, anexar `location.search` atual:

```tsx
const location = useLocation();
// ...
onClick={() => navigate(`/pedido/${order.id}${location.search}`)}
```

Mesma coisa para o clique direto via `ReportsPage.tsx:521` (scan de código de barras) — usar `location.search` quando existir.

### 2. `useOrderNeighbors` lê filtros da URL

Adicionar um parâmetro opcional `filters?: OrderFilters` (ou ler direto via `useSearchParams`). Preferência: ler com `useSearchParams` dentro do hook, usando exatamente as mesmas chaves que `ReportsPage` (`q`, `de`, `ate`, `status`, `vendedor`, `produtos`, `mudou_status`, `mudou_de`, `mudou_ate`).

Construir um `OrderFilters` a partir desses params e:

- Se a URL tiver **qualquer** filtro relevante, reaproveitar `fetchAllFilteredOrderIds(filters)` de `src/hooks/useOrders.ts` (já existe, faz exatamente isso em batches, com a mesma lógica de Juliana, `mudou_status` via RPC, etc.) e respeitar a mesma ordenação `data_criacao desc, hora_criacao desc`.
- Se **não** houver filtros na URL, manter o comportamento atual (varre tudo, com escopo admin/vendedor).

Manter o cálculo de `prevId`/`nextId`/`index`/`total` igual.

### 3. Botão "Voltar" preserva filtros

`src/pages/OrderDetailPage.tsx` — `navigate('/relatorios')` passa a ser `navigate(\`/relatorios${location.search}\`)` para que o usuário volte exatamente para a mesma página filtrada.

## Arquivos afetados

- `src/hooks/useOrderNeighbors.ts` — ler filtros via `useSearchParams`; quando houver, usar `fetchAllFilteredOrderIds` em vez da varredura genérica.
- `src/components/OrderCard.tsx` — incluir `location.search` na navegação ao abrir pedido.
- `src/pages/ReportsPage.tsx` — incluir `location.search` no `navigate` de scan (linha ~521).
- `src/pages/OrderDetailPage.tsx` — botão "Voltar" preserva `location.search`.

## Fora do escopo

- Não muda como os filtros são aplicados na listagem.
- Não muda paginação da listagem (`?page=` continua opcional, mas as setas atravessam todas as páginas do filtro — comportamento esperado).
- Não muda o "Conferido" nem a navegação por teclado (continua funcionando, só a sequência muda).
- Atalhos de busca direta por URL (`/pedido/:id` sem querystring) continuam funcionando com a sequência completa, como hoje.