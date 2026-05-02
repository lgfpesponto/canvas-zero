# Corrigir Total do PDF de Cobrança = Subtotal − Desconto (sempre)

## Regra confirmada
O **Total** impresso na coluna PREÇO de cada linha do PDF de Cobrança deve ser sempre **a soma dos itens listados na própria composição daquela linha** menos o desconto (ou mais o acréscimo). Vale para todos os pedidos, inclusive os antigos.

## Bug atual (pedido 23468)
`generateCobrancaPDF` (src/components/SpecializedReports.tsx, ~linha 1386) calcula:
```ts
const orderTotal = getOrderFinalValue(o);  // usa o.preco do banco
```
Os itens listados (Modelo, Bordados, Solado, etc.) são montados independentemente. Se `o.preco` do banco está dessincronizado dos itens, **a soma das linhas não bate com o Total impresso**. Foi o que aconteceu no 23468 (Total 377,20 vs soma 382,20).

## Correção
Trocar para:
```ts
const subtotalCalc = priceItems.reduce((s, [, v]) => s + (Number(v) || 0), 0);
const useCalc = !o.tipoExtra || o.tipoExtra === 'cinto';
const subtotalBase = useCalc && subtotalCalc > 0 ? subtotalCalc : undefined;
const orderTotal = getOrderFinalValue(o, subtotalBase);
```

- Bota normal e cinto: subtotal vem dos próprios `priceItems` (fonte única de verdade do que o PDF está mostrando).
- Bota Pronta Entrega e extras genéricos: continuam usando `o.preco` (já é o total final do extra).
- `getOrderFinalValue(order, subtotalOverride)` já aceita override (linha 33 de `src/lib/order-logic.ts`) — então desconto/acréscimo continuam sendo aplicados normalmente em cima do subtotal correto.

## Arquivo
- `src/components/SpecializedReports.tsx` (≈10 linhas, função `generateCobrancaPDF`)

## Verificação
- Regerar PDF de Cobrança → linha do 23468 deve mostrar **R$ 382,20** (soma dos itens), independentemente do que está em `o.preco` no banco.
- Pedidos com desconto/acréscimo: Total = Subtotal calc − desconto.
- Bota Pronta Entrega: total inalterado.
