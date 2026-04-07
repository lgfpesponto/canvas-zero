

## 1. Mostrar quantidade ao lado do preço na lista de pedidos + 2. Corrigir quantidade e valor nos PDFs

### Alterações

**1. `src/components/OrderCard.tsx`** — Exibir quantidade ao lado do preço

Após o span do preço (linha 43), adicionar:
```typescript
<span className="text-xs text-muted-foreground">
  Qtd: {order.tipoExtra === 'bota_pronta_entrega'
    ? (order.extraDetalhes?.botas?.length || 1)
    : order.quantidade}
</span>
```

**2. `src/components/SpecializedReports.tsx`** — PDF Expedição (~linhas 1037-1045)

Para `bota_pronta_entrega`, usar `det.botas.length` como quantidade e recalcular total da soma das botas:
```typescript
const isBotaPE = o.tipoExtra === 'bota_pronta_entrega';
const det = (o.extraDetalhes || {}) as any;
const realQtd = isBotaPE && Array.isArray(det.botas) ? det.botas.length : o.quantidade;
const orderTotal = isBotaPE
  ? compItems.reduce((s, [, v]) => s + v, 0)
  : (o.tipoExtra ? o.preco : compItems.reduce((s, [, v]) => s + v, 0));
doc.text(String(realQtd), cx[3] + 1, y + 5);
doc.text(formatCurrency(orderTotal), cx[4] + 1, y + 5);
totalValor += orderTotal;
totalQtd += realQtd;
```

**3. `src/components/SpecializedReports.tsx`** — PDF Cobrança (~linhas 1266-1271)

Mesma lógica:
```typescript
const isBotaPE = o.tipoExtra === 'bota_pronta_entrega';
const realQtd = isBotaPE && Array.isArray(det.botas) ? det.botas.length : o.quantidade;
doc.text(String(realQtd), cx[3] + 1, y + 5);
// orderTotal já calculado acima — garantir que para bota_pronta_entrega use soma dos priceItems
totalValor += orderTotal;
totalQtd += realQtd;
```

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/components/OrderCard.tsx` | Exibir quantidade ao lado do preço |
| `src/components/SpecializedReports.tsx` | Quantidade real e valor recalculado para bota_pronta_entrega nos PDFs de expedição e cobrança |

