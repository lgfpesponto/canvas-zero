
# Multi-seleção em "Mudou para o status" e "Progresso de Produção"

## Objetivo
Os dois filtros abaixo hoje só aceitam **um** status. Vão passar a aceitar **vários**, com a mesma UX do filtro "Progresso da Produção" já existente em Meus Pedidos (Popover + Checkboxes + atalhos "Todos / Nenhum"):

1. **Meus Pedidos** → bloco "Mudou para o status" (atualmente um `<select>` único).
2. **Relatórios Especializados** → "Progresso de Produção" (atualmente um `<Select>` shadcn único).

## Mudanças

### 1. Backend — RPC `find_orders_by_status_change`
Hoje recebe `_status text`. Vai passar a receber `_status text[]` para casar `historico[].local = ANY(_status)`.

```sql
create or replace function public.find_orders_by_status_change(
  _status text[],
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
    where h->>'local' = any(_status)
      and (h->>'data')::date between _de and _ate
  );
$$;
```

A versão antiga (assinatura `text`) será removida com `drop function ... (text, date, date)` para não conflitar.

### 2. Hook `src/hooks/useOrders.ts`
- `OrderFilters.mudouParaStatus`: `string` → `Set<string>`.
- `fetchIdsMudouParaStatus`: chama a RPC com array (`[...filters.mudouParaStatus]`) só quando o set tem ≥1 item.
- Sem mais mudanças (resto continua usando `idsMudou` como hoje).

### 3. `src/pages/ReportsPage.tsx` (Meus Pedidos)
- Estado `mudouStatus: string` → `mudouStatus: Set<string>` (init a partir de `searchParams.get('mudou_status')` separando por vírgula).
- URL: `mudou_status=Entregue,Cobrado` (CSV); limpa a chave quando vazio.
- UI: trocar o `<select>` por um Popover idêntico ao "Progresso da Produção" (botão "X selecionados", checkboxes da lista `allStatuses`, botões "Todos / Nenhum").
- Inputs De/Até ficam habilitados quando o set tem ≥1 item.
- Botão "Limpar filtros" zera o set.
- Propaga `Set<string>` para `appliedFilters.mudouParaStatus`.

### 4. `src/components/SpecializedReports.tsx` (Relatórios Especializados)
- `filterProgresso: string` → `filterProgresso: Set<string>`. Vazio = "Todos".
- Substituir o `<Select>` por Popover + Checkboxes (mesma UI do Meus Pedidos).
- Toda comparação atual `(filterProgresso === 'todos' || o.status === filterProgresso)` vira `(filterProgresso.size === 0 || filterProgresso.has(o.status))`. São ~14 ocorrências (linhas 404, 449, 467, 526, 571, 616, 706, 775, 938, 1418 + onde aplicável).
- Label/título dos PDFs (`progressoLabel`) e nomes de arquivo: 
  - vazio → "Todos"
  - 1 selecionado → o próprio nome
  - 2+ → "<N> status" no nome do arquivo (para evitar nomes gigantes) e lista completa separada por " / " no cabeçalho do PDF.
- `setFilterProgresso('todos')` no reset vira `setFilterProgresso(new Set())`.

## Resumo de arquivos
- **Migration SQL** (recriar `find_orders_by_status_change` recebendo `text[]`).
- `src/hooks/useOrders.ts` — tipo + chamada da RPC.
- `src/pages/ReportsPage.tsx` — estado, URL, UI Popover, "Limpar".
- `src/components/SpecializedReports.tsx` — estado, UI Popover, todas as comparações de status, labels e nomes de arquivo nos PDFs.

## Resultado para o usuário
Em ambos os filtros, ele clica no campo, marca quantos status quiser ("Corte" + "Pesponto" + "Entregue" etc.), e a lista/relatório passa a considerar todos eles juntos. Marcar nada = "Todos" (comportamento atual quando nada está selecionado).
