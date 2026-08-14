# Cancelamento na Bagy move o pedido para "Cancelado" no portal

## Situação atual

O webhook da Bagy já tem um trecho que tenta propagar o cancelamento, mas ele não funciona:

- A atualização grava um campo `motivo_cancelamento` que **não existe** na tabela de pedidos — o banco rejeita a gravação inteira e o pedido continua na etapa antiga (o erro é engolido pelo `try/catch`).
- Só o pedido "principal" é considerado. Pedidos desmembrados (A, B, C...) vindos do mesmo pedido Bagy não são cancelados.
- A propagação só ocorre se o vínculo com o portal já existia **antes** deste webhook; se o vínculo foi criado/relinkado nesta mesma chamada, nada acontece.

## O que será feito

Quando a Bagy enviar um pedido com status cancelado/estornado/devolvido:

- Todos os pedidos do portal ligados àquele pedido Bagy (inclusive os desmembrados A, B, C...) passam para a etapa **Cancelado**.
- O motivo ("Cancelado na Bagy") é registrado no histórico do pedido e na linha do tempo de mudanças de etapa, com o usuário "Bagy (webhook)".
- Pedidos que já estejam em "Cancelado" são ignorados (sem duplicar histórico).
- Se a gravação falhar, o erro passa a ser registrado no log do webhook em vez de ficar invisível.

## Detalhes técnicos

Arquivo: `supabase/functions/bagy-webhook/index.ts` (bloco `if (isRefund ...)` no final do handler).

1. Remover o campo inexistente `motivo_cancelamento` do `update` (motivo fica só no histórico).
2. Trocar a fonte dos pedidos: recarregar `orders` por `bagy_order_id` (mesma consulta de `loadPortalOrders`) após o relink, unindo com `createdOrderId`/`primaryExistingOrderId`, e iterar sobre todos.
3. Para cada pedido com `status <> 'Cancelado'`: atualizar `status` + `historico` (entrada com data/hora São Paulo, de/para, motivo, usuário) e inserir em `order_status_changes`.
4. Logar `error` retornado pelo Supabase (hoje ignorado) via `console.error` para diagnóstico nos logs da função.

Sem alterações de banco e sem mexer na devolução de estoque (já tratada por trigger no banco).
