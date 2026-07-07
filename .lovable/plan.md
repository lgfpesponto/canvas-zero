
## Regra: pedidos ERRO são simbólicos, valor sempre zero

Pedido ERRO só serve para registro/quantidade — nunca soma valor, não permite edição de preço, aparece em relatórios (incluindo cobrança) sempre zerado. Comissão já ignora (prefixo `ERRO` está em `EXCLUDED_PREFIXES`), mantido.

## Alterações

### 1. `src/lib/order-logic.ts` — zerar valor na fonte
- `getOrderBaseValue(order)`: se `order.erroDePedidoId` → retorna `0`.
- `getOrderFinalValue(order, subtotalOverride?)`: se `order.erroDePedidoId` → retorna `0` (ignora subtotalOverride e desconto).
- Ajustar assinaturas para incluir `erroDePedidoId` no `Pick`.

Impacto automático (sem outras mudanças):
- Listagens, dashboards, totais agregados frontend, PDFs de cobrança (`cobrancaPdf.ts` linhas 272-273), tela de detalhe → todos passam a exibir `R$ 0,00` para ERRO.
- Total agregado do backend (`get_orders_totals` RPC) usa `preco` do banco: como o INSERT do ERRO grava `preco = 0`, já vem zerado.

### 2. `src/pages/OrderDetailPage.tsx` — travar edição e limpar UI para ERRO
- Esconder bloco **"Edição de Valor"** (desconto/acréscimo) quando `order.erroDePedidoId`.
- Esconder botão de solicitação de ajuste (`AjusteValorSolicitacao`) quando ERRO.
- No bloco de composição do ERRO: **remover as linhas Subtotal/Total internas** que criei antes — o "Total final" externo (linha ~1043) já mostrará `R$ 0,00` pois `displayTotal` virá 0 do `getOrderFinalValue`. Fica apenas a linha simbólica **"ERRO — R$ 0,00"** dentro do quadro da composição.
- Esconder bloco de snapshot/histórico de preço só se ficar sem sentido (verificar visualmente após).

### 3. `src/lib/cobrancaPdf.ts` — item na fatura
- Não precisa de branch especial: como `getOrderFinalValue(o)` e `getOrderBaseValue(o)` retornarão 0 automaticamente, o pedido aparece com valor zerado no PDF de cobrança. Mantém a linha do pedido no relatório (registro), soma zero.
- Manter a lógica do EXCLUDED_PREFIXES intacta (já filtra ERRO de comissão/vendas).

## Fora do escopo desta entrega
- PDF de cobrança já vai exibir o pedido ERRO na listagem geral. Não vamos criar uma seção separada nem esconder — o valor zerado já cumpre o pedido.
- Fluxo de produção continua funcionando normalmente (sem mudança).

## Arquivos afetados
- `src/lib/order-logic.ts` (2 helpers)
- `src/pages/OrderDetailPage.tsx` (esconder Edição de Valor + limpar composição ERRO)
