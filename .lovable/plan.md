## Diagnóstico

Hoje o desconto é salvo no banco (`orders.desconto`), mas **só o relatório de Cobrança** o aplica. Em todo o resto, o "valor do pedido" exibido é calculado **ignorando o desconto**:

| Local | Mostra desconto hoje? | Como calcula |
|---|---|---|
| Detalhe do pedido — total no topo (`displayTotal`) | ❌ Não | `preco × quantidade` |
| Detalhe — bloco de Composição "Total" | ❌ Não | `preco × quantidade` |
| Detalhe — linha "Total com desconto" | ✅ Sim | só aparece se houver desconto, mas é uma linha extra abaixo |
| Lista "Meus Pedidos" (`OrderCard`) | ❌ Não | `preco × quantidade` (ou `preco` para extras) |
| `TrackOrderPage` | ❌ Não | `preco × quantidade` |
| PDF Cobrança | ✅ Sim (corrigido recentemente) | desconta de `orderTotal` |
| PDF Acompanhamento, Produção, demais | ❌ Não | usam `preco × quantidade` |

Resultado: você aplica R$ 50 de desconto, o "Total com desconto" aparece como linha separada no detalhe, mas o valor grande no topo, na lista e nos demais PDFs continua mostrando o valor cheio.

## Solução proposta

Centralizar o cálculo do valor final do pedido (já com desconto) em **uma função única** e usar ela em todos os lugares de exibição.

### 1. Criar helper único

Em `src/lib/order-logic.ts`, adicionar:

```ts
export function getOrderFinalValue(order: Order): number {
  const isBotaPE = order.tipoExtra === 'bota_pronta_entrega';
  const isRevit = order.tipoExtra === 'revitalizador' || order.tipoExtra === 'kit_revitalizador';
  const base = !order.tipoExtra
    ? order.preco * (order.quantidade || 1)        // bota normal
    : isBotaPE
      ? order.preco                                 // bota PE: total já no preco
      : isRevit
        ? order.preco * (order.quantidade || 1)    // revitalizadores
        : order.preco;                              // demais extras
  const desconto = order.desconto && order.desconto > 0 ? order.desconto : 0;
  return Math.max(0, base - desconto);
}

export function getOrderBaseValue(order: Order): number { /* mesma lógica sem desconto */ }
```

### 2. Substituir cálculos espalhados pela função única

**Telas/componentes:**
- `src/components/OrderCard.tsx` (linhas 48-77) → usar `getOrderFinalValue(order)`.
- `src/pages/OrderDetailPage.tsx`:
  - linha 403 (`displayTotal`) → aplicar desconto.
  - linhas 919 e 935 (Total da composição de extras e de bota) → mostrar valor com desconto.
  - linhas 940-952 (bloco do desconto) → manter o detalhamento "Subtotal / − Desconto / Total com desconto" como **breakdown explicativo**, mas o "Total" do topo já vem descontado, então ajustamos os rótulos pra não duplicar.
- `src/pages/TrackOrderPage.tsx` (linha 77) → usar `getOrderFinalValue(order)`.

**PDFs (`src/components/SpecializedReports.tsx`):**

Os PDFs que mostram valor por pedido vão passar a aplicar o desconto. Lista das funções relevantes:

- `generateCobrancaPDF` — **já aplica** (manter).
- `generateAcompanhamentoPDF` — passar a usar `getOrderFinalValue` no total da linha e no rodapé.
- `generateProducaoPDF` e demais que exibem coluna "Valor" — idem.
- Onde o PDF mostra a **composição/breakdown de peças**, adicionar a linha "Desconto (justificativa)" igual à do Cobrança quando `o.desconto > 0`, e o TOTAL do rodapé já vir descontado.

Vou varrer todas as funções `generate*PDF` em `SpecializedReports.tsx`, `pdfGenerators.ts` e qualquer outro local que faça `preco * quantidade` para padronizar.

### 3. Onde NÃO mexer

- **Tabelas internas de produção/corte/bordado** que não exibem valor monetário — ficam intactas.
- **Cálculo de comissão**: confirmar com você antes (hoje a comissão usa `preco × quantidade` cheio; se descontar, comissão diminui automaticamente). Vou tratar comissão na pergunta abaixo, sem alterar nada por padrão.
- **Métricas de vendas do dashboard**: idem — confirmar se "vendas do mês" deve refletir desconto ou valor bruto.

## Decisões pra você confirmar antes de eu implementar

1. **Comissão do vendedor**: o desconto deve reduzir a comissão proporcionalmente, ou comissão continua sobre o valor cheio?
2. **Métricas do dashboard** ("Vendas do mês", gráficos de faturamento): mostram valor já com desconto ou bruto?
3. **Visual no detalhe**: prefere manter o bloco atual "Subtotal / Desconto / Total com desconto" como detalhamento abaixo, **ou** simplificar pra mostrar só o total final no topo + uma tag pequena tipo "(R$ 50 desc.)"?

## Arquivos editados

- `src/lib/order-logic.ts` — nova função `getOrderFinalValue`.
- `src/components/OrderCard.tsx` — usar helper.
- `src/pages/OrderDetailPage.tsx` — usar helper, ajustar bloco de desconto.
- `src/pages/TrackOrderPage.tsx` — usar helper.
- `src/components/SpecializedReports.tsx` — aplicar desconto em todos os PDFs que mostram valor.
- `src/lib/pdfGenerators.ts` (se houver função com valor lá) — idem.

## Resultado esperado

Aplicou desconto → o valor novo aparece **imediatamente e em todo lugar**: card da lista, topo do detalhe, qualquer PDF impresso. A justificativa fica registrada e visível como hoje.
