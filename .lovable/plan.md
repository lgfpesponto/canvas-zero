
## Objetivo
Definir R$ 30 como valor base de **Gravata Pronta Entrega** e corrigir TODOS os pedidos existentes que estão zerados.

## Mudanças

### 1. Backfill retroativo (migração SQL)
Atualizar todos os pedidos com `tipo_extra = 'gravata_pronta_entrega'` que estão com `preco = 0`:
- `preco = 30`
- `preco_migrado_v2 = true`
- `preco_congelado = true` (para travar o valor e não ser mexido por reconciliadores futuros)
- Registrar entrada em `historico` com motivo "Ajuste retroativo: Gravata Pronta Entrega padronizada em R$ 30".

Impacto colateral esperado (intencional):
- Comissão histórica desses pedidos passa a contar R$ 30 cada.
- Saldo de revendedor: o trigger de mudança de preço vai gerar baixa/estorno automaticamente para os pedidos já cobrados. Como agora têm `preco_congelado = true`, não geram estorno futuro.
- Relatórios de vendas/dashboard refletem o novo valor.

### 2. Cálculo no frontend (`recomputeOrderPrice.ts`)
Adicionar case no `computeExtraTotal`:
```ts
case 'gravata_pronta_entrega': t += 30; break;
```
Garante que pedidos novos/editados gravem R$ 30 automaticamente, igual ao `gravata_country`.

### 3. (Opcional) Sem alteração em `extrasConfig.ts`
O `EXTRA_PRODUCTS` já tem `gravata_pronta_entrega` com `precoBase: 30` — nada a mudar.

## Confirmação necessária
Confirma que:
1. **TODOS** os pedidos `gravata_pronta_entrega` zerados devem ir para R$ 30 (mesmo os bem antigos, já entregues/pagos)?
2. Pode impactar comissão histórica e gerar movimentos automáticos de saldo nos revendedores afetados?

Se sim, executo a migração + ajuste no frontend.
