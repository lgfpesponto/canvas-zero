## Ajuste no relatório de Cobrança

Reduzir o filtro para incluir apenas pedidos com status **Entregue** e **Cobrado** (remover **Pago**).

### Mudança
- Arquivo: `src/components/SpecializedReports.tsx`, função `generateCobrancaPDF`.
- De: `['entregue', 'cobrado', 'pago']`
- Para: `['entregue', 'cobrado']`

### Resultado
- O PDF de Cobrança junta somente os pedidos Entregues + Cobrados.
- Pedidos já marcados como Pago deixam de aparecer no relatório.
- Restante do layout, cálculo, código de barras e nome do arquivo permanecem iguais.