## Plano

1. **Corrigir a origem do problema no webhook da Bagy**
   - O fluxo atual chama `comprar_estoque_bagy`, que já cria 1 pedido por par com sufixos A/B/C.
   - Porém o webhook salva em `bagy_pedidos.order_id_portal` e em todos os `bagy_pedido_itens.order_id_portal` apenas o primeiro pedido criado, então a tela/tracking fica como se fosse um pedido único.
   - Ajustar `supabase/functions/bagy-webhook/index.ts` para ler também `order_ids` e `numeros` retornados pelo RPC.

2. **Vincular corretamente cada item/unidade Bagy aos pedidos criados**
   - Para pedidos de estoque com mais de 1 par, manter a criação de pedidos separados: `RC-123A`, `RC-123B`, `RC-123C`...
   - Atualizar os itens de `bagy_pedido_itens` em ordem, expandindo quantidade por unidade, para relacionar cada linha ao respectivo pedido criado quando possível.
   - Manter `bagy_pedidos.order_id_portal` apontando para o primeiro pedido apenas como referência principal, sem perder os demais vínculos nos itens.

3. **Evitar regressão em reprocessamentos e webhooks repetidos**
   - Ajustar a lógica de idempotência no webhook para reconhecer que já podem existir vários pedidos do mesmo `bagy_order_id`.
   - Em reentrega/reprocessamento, não recriar pedidos nem voltar status visual, apenas reapontar os itens existentes para os pedidos já criados.

4. **Melhorar a visualização no portal Bagy, se necessário**
   - Na página de pedidos Bagy, quando houver múltiplos pedidos portal vinculados aos itens, mostrar/abrir o pedido correto por item em vez de sempre abrir o primeiro.
   - Quando o cabeçalho do pedido tiver só uma referência principal, manter botão para o primeiro pedido e deixar os demais acessíveis nas linhas dos produtos.

5. **Validar com dados reais sem alterar histórico indevidamente**
   - Conferir pedidos Bagy recentes com `qtd_estoque > 1` e garantir que novos pedidos aprovados criem todos os sufixos.
   - Não fazer backfill automático em pedidos antigos já processados, a menos que você peça explicitamente depois.

## Detalhes técnicos

- Arquivos previstos:
  - `supabase/functions/bagy-webhook/index.ts`
  - Possivelmente `src/pages/RanchoChiquePedidosPage.tsx` para exibir vínculos múltiplos corretamente.
- Banco:
  - Não deve precisar criar tabela nem coluna nova.
  - Se for necessário reforçar a função SQL `comprar_estoque_bagy`, farei uma migração mantendo a regra atual: 1 pedido por par e sufixo alfabético quando o total for maior que 1.