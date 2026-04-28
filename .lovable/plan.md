# Ajuste no Relatório Especializado de Cobrança

## Mudança
Restringir o PDF de **Cobrança** para listar **somente pedidos com status `Entregue`**, excluindo `Cobrado`.

## Arquivo afetado
- `src/components/SpecializedReports.tsx` — função `generateCobrancaPDF`, linha 1176

## Detalhe técnico
Trocar:
```ts
const COBRANCA_STATUSES = ['entregue', 'cobrado'];
```
por:
```ts
const COBRANCA_STATUSES = ['entregue'];
```

Nada mais é alterado: filtro de vendedor, ordenação por nº de pedido, layout A4, código de barras, totalizadores e nome do arquivo (`Cobrança - <vendedor> - <data> - R$ <total> - <qtd> pares.pdf`) permanecem idênticos.

## Resultado
- O PDF passa a mostrar apenas o que ainda precisa ser cobrado (status `Entregue`).
- Pedidos já marcados como `Cobrado`, `Pago` ou `Cancelado` ficam de fora.
