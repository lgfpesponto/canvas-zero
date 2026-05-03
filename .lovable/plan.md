## Objetivo

Quando um pedido já baixado tem seu valor alterado, **estornar a baixa anterior**, **devolver o valor ao saldo** e **voltar o pedido para "Cobrado"**. Se o saldo atual não cobrir o novo valor, o pedido **fica em "Cobrado" mostrando "Falta R$ X,XX para quitar"** (sem permitir saldo negativo).

## Comportamento

**Cenário exemplo:**
- Pedido baixado por R$ 300 → status "Pago"
- Admin edita o pedido → novo valor R$ 315
- Sistema estorna os R$ 300 ao saldo do vendedor
- Tenta nova baixa: saldo (R$ 300) < R$ 315 → **não baixa**
- Pedido volta para "Cobrado"
- Em qualquer tela onde aparece o pedido (lista de pedidos, painel do revendedor, detalhe), exibe a tag: **"Falta R$ 15,00 para quitar"**

**Quando saldo cobre:** baixa automaticamente e volta para "Pago" (sem mostrar tag).

## Mudanças técnicas

### 1. Migration (`supabase/migrations/...`)

**a)** Correção retroativa dos 50 pedidos do Rafael Silva travados em "Cobrado" com baixa registrada → atualizar para "Pago" + adicionar histórico "Baixa automática (correção retroativa)".

**b)** Trigger `trg_orders_value_change_baixa` em `BEFORE UPDATE OF preco, quantidade, vendedor ON orders`:
   - Se o pedido tem registro em `revendedor_baixas_pedido` E (`preco*quantidade` mudou OU `vendedor` mudou):
     1. Insere movimento `estorno` devolvendo `valor_pedido` ao saldo do vendedor original
     2. `DELETE` da linha em `revendedor_baixas_pedido`
     3. Força `NEW.status := 'Cobrado'` (e adiciona histórico "Estorno automático: valor alterado")
     4. Após o UPDATE (trigger AFTER), chama `tentar_baixa_automatica(NEW.vendedor)` — se saldo cobrir, volta a "Pago"; senão fica em "Cobrado"

**c)** Reprocessamento global: rodar `tentar_baixa_automatica` para todos os vendedores com saldo > 0 (aproveita saldo recém-liberado).

**Saldo negativo:** **não permitido** (regra mantida). Pedido fica em "Cobrado" com indicador de falta.

### 2. Helper compartilhado (`src/lib/saldo-utils.ts`)

```ts
export function getValorFaltanteParaQuitar(
  order: Order, 
  saldoVendedor: number
): number {
  if (order.status !== 'Cobrado') return 0;
  const valorPedido = (order.preco ?? 0) * (order.quantidade ?? 1) - (order.desconto ?? 0);
  const falta = valorPedido - saldoVendedor;
  return falta > 0 ? falta : 0;
}
```

### 3. UI — Tag "Falta R$ X para quitar"

Exibir em badge âmbar/laranja nos seguintes locais quando `falta > 0`:
- `src/pages/RelatoriosPage.tsx` (lista de pedidos — coluna status)
- `src/pages/OrderDetailPage.tsx` (header do pedido, ao lado do status)
- `src/pages/SaldoRevendedorPage.tsx` (painel do revendedor — lista de pedidos cobrados)
- PDF financeiro de cobrança (opcional — adicionar coluna "Falta")

Para evitar N consultas de saldo, buscar saldo dos vendedores envolvidos uma vez por tela (já existe `vw_revendedor_saldo`) e mapear por nome.

### 4. Realtime

Como já há subscription em `orders` e `revendedor_saldo_movimentos`, as telas vão recalcular a tag automaticamente quando o trigger disparar.

## Arquivos afetados

- **Novo:** `supabase/migrations/20260503010000_baixa_estorno_automatico_e_correcao.sql`
- **Novo:** `src/lib/saldo-utils.ts` (helper `getValorFaltanteParaQuitar`)
- **Editar:** `src/pages/RelatoriosPage.tsx`, `src/pages/OrderDetailPage.tsx`, `src/pages/SaldoRevendedorPage.tsx`
- **Memória:** atualizar `mem://features/financeiro/saldo-revendedor` com regra de estorno automático e tag "Falta para quitar"

## Confirmações

1. Confirma que **saldo nunca pode ficar negativo** (estorno + tag de falta é a abordagem correta)?
2. Quer a tag "Falta R$ X" também no **PDF financeiro de cobrança**?