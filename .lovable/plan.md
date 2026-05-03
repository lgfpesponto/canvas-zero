## Refinar portal Bordado: visão de pedido + transições controladas

### 1. Reescrever `BordadoOrderView` para espelhar o detalhe normal

Em vez do card minimalista atual, o componente vai renderizar o **mesmo layout** do `OrderDetailPage` (cabeçalho 2×2 + bloco "Detalhes da Bota" agrupado por categoria), porém:

- Sem o lápis de edição em nenhum bloco.
- Sem a seção "Composição do Pedido" (preços, subtotal, total, desconto, conferido).
- Sem "Histórico de Alterações", "Histórico de Impressão", botões de imprimir/excluir/editar.
- A célula **Foto** mostra "Ver foto" e abre o **`FotoPedidoSidePanel`** (mesmo painel lateral, mesma animação `max-w-3xl → max-w-6xl`).
- Mostra **Vendedor** (não troca por Cliente — bordado é interno).
- Mostra "Status atual" como badge.
- Reusa o mesmo array `detailsGrouped` (Identificação / Couros / Bordados / Laser / Pesponto / Metais / Extras / Solados / Finalização) — exatamente como o admin vê, mas sem valores monetários.

Tecnicamente: extrair o cálculo de `detailsGrouped` em `src/lib/orderDetailGroups.ts` (helper puro) reaproveitado por OrderDetailPage e BordadoOrderView, evitando manter dois lugares.

### 2. Barra superior idêntica à do admin

Acima da ficha:
- **← Voltar** (volta para `/bordado`).
- **Paginação** (`< 1/2866 >`) usando `useOrderNeighbors(id)` — RLS já restringe a lista aos 2 status do bordado, então o vizinho será sempre outro pedido bordado.
- **☐ Selecionar** (usa `useSelectedOrders` igual ao admin) → quando count > 0 aparece a barra de bulk:
  - Select de novo status restrito a `Entrada Bordado 7Estrivos` / `Baixa Bordado 7Estrivos`.
  - Mesmas regras de transição da seção 4 aplicadas pedido-a-pedido.
- **🔍 Buscar Pedido**: abre o **mesmo input inline** do `OrderDetailPage` (não modal) usando `fetchOrderByScan`; ao achar, navega para `/pedido/:id`.

### 3. Portal `/bordado` (lista)

Mantém as duas colunas Entrada / Baixa, mas:
- Ao clicar num card, navega direto para `/pedido/:id` (não abre mais o modal de ação rápida).
- Mantém o botão grande **"Escanear / Buscar pedido"** que abre o scanner em modal (modo balcão), e ao achar navega para o pedido.
- Mantém o gerador de PDF do dia.

### 4. Regras de transição de status (Entrada ↔ Baixa)

No componente do pedido, aparecerão **botões de progresso** (substituindo os dois botões diretos atuais):

- Status atual **fora do bordado**: nenhum botão (RLS nem deixa ver, mas guard).
- Status atual **Entrada Bordado 7Estrivos**:
  - Botão "Marcar BAIXA Bordado" → chama RPC sem justificativa.
- Status atual **Baixa Bordado 7Estrivos**:
  - Botão "Voltar para ENTRADA Bordado" → abre `JustificativaDialog` (kind=regression). Só envia ao confirmar com motivo.
- **Nunca** permitir Baixa direto sem ter passado por Entrada (a RPC valida).

### 5. Atualizar RPC `bordado_baixar_pedido`

Nova migration substituindo a função:

```sql
create or replace function public.bordado_baixar_pedido(
  _order_id uuid,
  _novo_status text,
  _justificativa text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _atual text;
  _user_nome text;
begin
  if not (has_role(auth.uid(),'bordado') or has_role(auth.uid(),'admin_master')) then
    raise exception 'Sem permissão';
  end if;
  if _novo_status not in ('Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos') then
    raise exception 'Status inválido';
  end if;

  select status into _atual from orders where id = _order_id for update;
  if _atual is null then raise exception 'Pedido não encontrado'; end if;
  if _atual = _novo_status then return; end if;

  -- Regras de transição
  if _novo_status = 'Baixa Bordado 7Estrivos'
     and _atual <> 'Entrada Bordado 7Estrivos' then
    raise exception 'É preciso passar por Entrada Bordado antes de dar Baixa';
  end if;
  if _novo_status = 'Entrada Bordado 7Estrivos'
     and _atual = 'Baixa Bordado 7Estrivos'
     and coalesce(btrim(_justificativa),'') = '' then
    raise exception 'Justificativa obrigatória para retroceder Baixa → Entrada';
  end if;

  select coalesce(nome_completo, email) into _user_nome
    from profiles where id = auth.uid();

  update orders
  set status = _novo_status,
      historico = coalesce(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'data', to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD'),
        'hora', to_char(now() at time zone 'America/Sao_Paulo','HH24:MI'),
        'local', _novo_status,
        'descricao', case
          when _novo_status='Entrada Bordado 7Estrivos' and _atual='Baixa Bordado 7Estrivos'
            then 'Retrocesso Baixa→Entrada Bordado: ' || _justificativa
          else 'Movido para ' || _novo_status end,
        'usuario', _user_nome,
        'justificativa', _justificativa
      ))
  where id = _order_id;
end;
$$;
```

### 6. Mudanças no front

Arquivos:
- `src/components/BordadoOrderView.tsx` — reescrita completa (layout estilo OrderDetailPage, paginação, scanner inline, bulk select, JustificativaDialog).
- `src/lib/orderDetailGroups.ts` (novo) — helper `buildDetailsGrouped(order)`.
- `src/pages/OrderDetailPage.tsx` — usar o novo helper (refactor sem mudança visual).
- `src/pages/BordadoPortalPage.tsx` — remover modal de ação rápida; cards levam para `/pedido/:id`.
- `src/hooks/useOrders.ts` (se necessário) — garantir que `useOrderNeighbors` respeita RLS (nenhuma alteração esperada).
- Nova migration SQL substituindo a RPC.

### 7. Memória

Atualizar `mem://auth/role-bordado` documentando: visão estilo ficha sem preços, paginação/seleção/scanner reaproveitados, e a regra de transição (não pula Entrada; volta exige justificativa registrada no histórico).

### Ordem de implementação

1. Migration nova RPC.
2. Helper `orderDetailGroups.ts` + refactor leve em OrderDetailPage.
3. Reescrita do `BordadoOrderView` (layout, paginação, scanner inline, bulk, justificativa).
4. Ajuste do `BordadoPortalPage` (remover modal de ação rápida).
5. Atualizar memória.

Aprovando, implemento nesta ordem.