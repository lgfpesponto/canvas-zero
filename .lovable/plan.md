## Corrigir totais agregados em Meus Pedidos

### Problema
O hook `useOrders` calcula valor total e total de produtos baixando linhas com `.select(...)` sem `.range()`, o que esbarra no limite implícito de 1000 linhas do PostgREST. Resultado: portal mostra ~1.025 produtos e R$ 301.839,57 quando o real é **2.664 produtos / R$ 823.551,17** (com 2.603 pedidos).

### Solução

**1. Migration — criar RPC `get_orders_totals`**

Função SECURITY DEFINER que aceita os mesmos filtros do hook (search, datas, status, produtos, vendedores, ids do filtro "mudou para status") e devolve `(total_pedidos bigint, total_produtos bigint, valor_total numeric)`.

Lógica de `total_produtos` espelha 1:1 a do frontend:
- `bota_pronta_entrega` com `extra_detalhes->'botas'` populado → usa `jsonb_array_length(botas)`
- Caso contrário → usa `quantidade` (cobre revitalizador, kit_2_revitalizador, cintos, etc.)

Filtro de vendedor inclui a regra dos vendedores virtuais (clientes da Juliana Cristina Ribeiro).

**2. `src/hooks/useOrders.ts`**

Substituir o bloco `valueQuery` (linhas 128–173) por uma chamada `supabase.rpc('get_orders_totals', { ... })`. Mantém `setTotalValue` e `setTotalProdutos` com os valores devolvidos pela RPC. A query principal paginada (linhas 61–125) continua igual.

### Resultado esperado

Sem filtros: **2.603 pedidos · 2.664 produtos · R$ 823.551,17**. Com filtros: os 3 totais refletem corretamente o subconjunto, sem teto de 1000.
