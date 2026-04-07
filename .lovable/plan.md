

## Mostrar extras embutidos na composicao do pedido (detalhes + PDFs)

### Problema

Na secao "Composicao do Pedido" do `OrderDetailPage` (linhas 557-566), quando itera `det.botas`, lista apenas a descricao e valor manual de cada bota, sem incluir os extras embutidos (`b.extras`). O valor tambem nao soma os extras. O mesmo problema pode ocorrer no `buildCompositionItems` do `SpecializedReports` que ja inclui extras (linhas 277-282), mas o `OrderDetailPage` nao.

### Alteracoes

**1. `src/pages/OrderDetailPage.tsx`** — Composicao do Pedido (linhas 557-566)

Ao iterar `det.botas`, apos adicionar o item da bota, tambem adicionar cada extra embutido como sub-item com "↳":

```typescript
case 'bota_pronta_entrega': {
  if (Array.isArray(det.botas)) {
    (det.botas as any[]).forEach((b: any, idx: number) => {
      const val = parseFloat(b.valorManual) || 0;
      extraPriceItems.push([`Bota ${idx + 1}: ${b.descricaoProduto || ''}`, val]);
      // Add embedded extras
      if (Array.isArray(b.extras)) {
        b.extras.forEach((ex: any) => {
          const LABELS: Record<string, string> = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
          extraPriceItems.push([`  ↳ ${LABELS[ex.tipo] || ex.tipo}`, ex.preco || 0]);
        });
      }
    });
  } else {
    extraPriceItems.push(['Bota Pronta Entrega', order.preco]);
  }
  break;
}
```

Isso garante que os extras embutidos aparecem na composicao com preco individual e somam ao total.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderDetailPage.tsx` | Composicao lista extras embutidos de cada bota com "↳" e preco |

