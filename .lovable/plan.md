## Correção: Desconto sumindo no PDF de Cobrança

### Causa
Em `src/components/SpecializedReports.tsx` (linha ~1391), quando o pedido tem **desconto** (`o.desconto > 0`), o código empurra o valor como **negativo**:
```ts
priceItems.push([label, isAcr ? Math.abs(o.desconto) : -o.desconto]);
```
O `formatCurrency(-10)` produz algo como `-R$ 10,00`. Combinado com a fonte 6pt e o `splitTextToSize`, a linha "Desconto -R$ 10,00" pode estar quebrando ou sendo cortada visualmente — por isso o "Acréscimo" aparece e o "Desconto" não.

### Correção
Sempre empurrar o valor **absoluto positivo**. O tipo (acréscimo/desconto) já é indicado pelo rótulo + bolinha colorida na coluna do número do pedido (verde/vermelha), então não precisa de sinal negativo no número.

```ts
if (o.desconto && o.desconto !== 0) {
  const isAcr = o.desconto < 0;
  const label = isAcr ? 'Acréscimo' : 'Desconto';
  priceItems.push([label, Math.abs(o.desconto)]);
}
```

A bolinha (verde p/ acréscimo, vermelha p/ desconto) e o cálculo do `getOrderFinalValue` continuam intactos — só muda a apresentação do número.

### Arquivo
- `src/components/SpecializedReports.tsx` (bloco ~linhas 1387-1392)
