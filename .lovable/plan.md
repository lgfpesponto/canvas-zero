## Problema

1. **Horário errado nos pedidos Bagy**: o painel Bagy mostra 20:53, mas o portal mostra 17:53 (−3h). Bagy envia `created_at` como `2026-07-18T20:53:00` sem timezone. Em `supabase/functions/bagy-webhook/index.ts:396`, `new Date(bagyCreatedRaw).toISOString()` interpreta a string como UTC, e depois a RPC `criar_pedido` converte para America/Sao_Paulo (UTC−3), tirando 3 horas.

2. **Nome do cliente não aparece no topo** dos pedidos importados da Bagy. Em `OrderDetailPage.tsx` (~L733), para admin só mostra "Vendedor: Rancho Chique". O nome do cliente já está salvo em `orders.cliente`, mas não é exibido no cabeçalho.

## Correções

### 1. Horário Bagy — tratar timestamp naive como horário de São Paulo
Em `supabase/functions/bagy-webhook/index.ts` (~L392–L396), substituir a normalização por uma que detecta se a string tem timezone (`Z` ou `±HH:MM`); se não tiver, anexa `-03:00` antes de converter para ISO. Assim `2026-07-18T20:53:00` vira `2026-07-18T20:53:00-03:00` → armazenado como `23:53Z` → RPC exibe 20:53 (bate com Bagy).

### 2. Backfill dos pedidos já importados com horário errado
Migração SQL para pedidos Bagy (`orders.bagy_order_id IS NOT NULL`) recalculando `hora_criacao` a partir de `bagy_pedidos.bagy_created_at` (+3h para os que foram criados com o bug — detectado quando a hora atual em orders + 3h coincide com o horário exibido no painel Bagy). Só mexe em pedidos com `bagy_order_id`, ignora Cancelados/Cobrados/Pagos/Conferido para segurança.

### 3. Mostrar cliente no cabeçalho dos pedidos Bagy
Em `src/pages/OrderDetailPage.tsx` (~L720), adicionar antes do grid 2×2 uma linha destacada quando `order.bagy_order_id` existir:
```
CLIENTE (Bagy): {order.cliente}
```
Visível para todos os perfis (admin e vendedor). Não altera as demais células.

## Detalhes técnicos

Arquivos alterados:
- `supabase/functions/bagy-webhook/index.ts` — normalização do `bagyCreatedAt`.
- `src/pages/OrderDetailPage.tsx` — nova linha "Cliente" no cabeçalho para pedidos com `bagy_order_id`.
- Nova migration — backfill do `hora_criacao` dos pedidos Bagy importados antes do fix.

Regra de detecção do backfill: pega `bagy_pedidos.bagy_created_at` (já normalizado como UTC), soma 3h e recompõe `data_criacao`/`hora_criacao` no fuso São Paulo. Assim funciona igual para pedidos com e sem o bug (ideempotente).