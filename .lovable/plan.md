
# Filtro por "Data de mudança para status X" em Meus Pedidos

## Objetivo
Permitir filtrar a lista da página **Meus Pedidos** por:
- **Status alvo** (ex.: "Entregue", "Cobrado", "Pago", "Corte"...)
- **Data inicial** e **Data final** em que o pedido foi movido para aquele status

Exemplo: ver todos os pedidos que foram para "Entregue" no dia 27/04/2026.

## Como funciona hoje
Cada pedido guarda um array JSONB `historico` na tabela `orders`, com entradas:
```json
{ "data": "2026-04-27", "hora": "14:32", "local": "Entregue", "descricao": "Pedido movido para Entregue" }
```
Toda mudança de status feita por `updateOrderStatus` adiciona uma entrada nesse array. Logo, já temos o dado — só falta consultar e expor na UI.

O filtro de data atual (`filterDate` / `filterDateEnd`) filtra por `data_criacao` (criação do pedido), não por mudança de status. Vamos manter esse filtro como está e **adicionar um novo bloco de filtro** ao lado.

## UI — página Meus Pedidos (ReportsPage)
Adicionar, ao lado dos filtros de Período / Status / Vendedor / Produto, um novo bloco:

```text
[ Mudou para status ▼ ]   [ De: __/__/____ ]   [ Até: __/__/____ ]
```

- **Mudou para status**: Select com a mesma lista de status existente (`allStatuses`), com opção "—" (vazio = filtro desligado).
- **De / Até**: dois inputs `type="date"`. Se "Até" ficar vazio, usa o mesmo dia do "De".
- Quando o usuário escolhe um status, o filtro fica ativo. Mostrar um chip "Limpar" para resetar.
- Estado persiste na URL via os mesmos `searchParams` já usados (chaves novas: `mudou_status`, `mudou_de`, `mudou_ate`).
- Botão "Limpar filtros" também zera esses três.

## Backend — nova função RPC
JSONB array com dois campos não permite consulta eficiente direto via PostgREST. Criar função SQL `SECURITY DEFINER`:

```sql
create or replace function public.find_orders_by_status_change(
  _status text,
  _de date,
  _ate date
) returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select o.id
  from public.orders o
  where exists (
    select 1
    from jsonb_array_elements(coalesce(o.historico, '[]'::jsonb)) h
    where h->>'local' = _status
      and (h->>'data')::date between _de and _ate
  );
$$;
```

Retorna apenas IDs — barato e seguro (RLS continua valendo nos `select` posteriores).

## Integração no `useOrders`
Estender `OrderFilters` com:
```ts
mudouParaStatus?: string;
mudouParaStatusDe?: string;   // YYYY-MM-DD
mudouParaStatusAte?: string;  // YYYY-MM-DD
```

Fluxo no `fetchOrders`:
1. Se `mudouParaStatus` estiver definido, chamar `supabase.rpc('find_orders_by_status_change', {...})` primeiro.
2. Se vier `[]` → setar resultados vazios (curto-circuito, evita query principal).
3. Caso contrário, aplicar `.in('id', [...ids])` na query principal **e** na query de totais (`valueQuery`).
4. Os outros filtros (vendedor, produto, status atual, busca, data de criação) continuam combinando normalmente.

Mesma extensão em `fetchAllFilteredOrders` (usado na exportação de PDF), para que os PDFs respeitem o novo filtro.

## Resumo de arquivos
- **Migration SQL**: criar a função `find_orders_by_status_change`.
- **`src/hooks/useOrders.ts`**: estender `OrderFilters`, integrar RPC em `fetchOrders` e `fetchAllFilteredOrders`.
- **`src/pages/ReportsPage.tsx`**: novos estados + UI (select de status + 2 inputs de data), persistência na URL, propagação para `appliedFilters`, integração no botão "Limpar filtros".

## Resultado para o usuário
Na página Meus Pedidos, escolhendo "Mudou para status: Entregue" + "De: 27/04/2026" + "Até: 27/04/2026" a lista (e os PDFs gerados a partir dela) mostram apenas os pedidos cuja transição para "Entregue" aconteceu nesse dia.
