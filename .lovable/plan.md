## Objetivo

1. Mover a seção **"Composição do Pedido"** para cima dos **"Detalhes da Bota"**, logo abaixo do botão **Conferido** (admin_master).
2. Substituir o card **"Aplicar Desconto"** por **"Edição de Valor"**, com escolha entre **Desconto** ou **Acréscimo**.
3. O valor ajustado deve refletir automaticamente em **todo lugar** que mostra valor do pedido: lista (`OrderCard`), topo do detalhe, totais agregados, PDF de cobrança, demais relatórios e tracking público.

## Estratégia técnica (sem migração de banco)

Reaproveitamos o campo já existente `order.desconto`:
- **Desconto** → grava valor positivo (subtrai do total) — comportamento atual.
- **Acréscimo** → grava valor **negativo** (será somado ao total).

Atualizamos o helper central `getOrderFinalValue` em `src/lib/order-logic.ts`:

```ts
export function getOrderFinalValue(order) {
  const base = getOrderBaseValue(order);
  const ajuste = Number(order.desconto) || 0; // positivo = desconto, negativo = acréscimo
  return Math.max(0, base - ajuste);
}
```

Como **todos** os lugares que mostram valor já chamam `getOrderFinalValue` (OrderCard, OrderDetailPage topo, TrackOrderPage, pdfGenerators, SpecializedReports cobrança e demais), o reflexo é automático.

## Mudanças em `src/pages/OrderDetailPage.tsx`

### Reordenação
Mover o bloco **Composição do Pedido** (atualmente linhas ~812–978) para logo após o card **Conferido** (linha ~678) e antes do `<h2>Detalhes…`. O conteúdo da composição permanece idêntico (já mostra justificativas de alteração que afetaram valor).

### Card "Edição de Valor" (substitui "Aplicar Desconto", linhas ~980–1035)

- Título: **Edição de Valor**.
- Seletor (RadioGroup ou Tabs) **Tipo**: `Desconto` | `Acréscimo`.
- Input **Valor (R$)** numérico.
- Input **Justificativa** (obrigatória, textarea).
- Botão dinâmico: "Aplicar Desconto" / "Aplicar Acréscimo".
- Ao salvar:
  - `delta = tipo === 'desconto' ? +valor : -valor`
  - `novoAjuste = (order.desconto || 0) + delta`
  - Validar: se `novoAjuste` resultar em total final < 0, bloquear com toast.
  - `descricao` no histórico: `"Desconto aplicado: R$ X | Justificativa: … | Por: …"` ou `"Acréscimo aplicado: R$ X | Justificativa: … | Por: …"`.
  - `alteracoes` com `afetouValor: true` (já é o padrão para mudanças em `desconto`).
- Mantém a regra: **somente `admin_master`** vê e usa este card (admin_producao não pode mexer no valor monetário — coerente com restrições atuais).

### Exibição na Composição (bloco existente que mostra `order.desconto`)
Atualizar o trecho que renderiza o ajuste para suportar acréscimo:

```tsx
{order.desconto && order.desconto !== 0 && (() => {
  const isAcr = order.desconto < 0;
  const abs = Math.abs(order.desconto);
  return (
    <>
      <div className={`flex justify-between pt-1 ${isAcr ? 'text-emerald-600' : 'text-destructive'}`}>
        <span className="text-sm font-semibold">{isAcr ? 'Acréscimo' : 'Desconto'}</span>
        <span className="text-sm font-semibold">{isAcr ? '+ ' : '- '}{formatCurrency(abs)}</span>
      </div>
      <div className="flex justify-between pt-1 font-bold text-lg border-t border-border mt-1">
        <span>Total {isAcr ? 'com acréscimo' : 'com desconto'}</span>
        <span className="text-primary">{formatCurrency(getOrderFinalValue(order))}</span>
      </div>
      {order.descontoJustificativa && (
        <p className="text-xs text-muted-foreground mt-1 italic">Justificativa: {order.descontoJustificativa}</p>
      )}
    </>
  );
})()}
```

A seção "Justificativas de alterações de valor" abaixo já é alimentada por `alteracoes` com `afetouValor=true` e continua funcionando para acréscimos (gravamos a alteração com `afetouValor: true`).

## Mudanças em `src/lib/order-logic.ts`

Atualizar `getOrderFinalValue` para tratar `desconto` negativo como acréscimo (somar). Já documentar no comentário do helper. Como `getOrderBaseValue` permanece, todos os PDFs/relatórios que somam totais por pedido (cobrança, lista de pedidos PDF, métricas) usarão automaticamente o novo valor final — não há outro ponto a alterar.

## Mudanças em `src/components/SpecializedReports.tsx` (PDF de cobrança)

Já usa `getOrderFinalValue` para o total por linha e somatórios. Apenas ajustar o texto do "COMPOSIÇÃO" para citar **"Acréscimo"** quando `order.desconto < 0` (atualmente só fala "Desconto"). Ajuste cosmético no parágrafo que lista o ajuste, mantendo a justificativa.

## Pontos não impactados (já corretos)

- `OrderCard.tsx`, topo do `OrderDetailPage`, `TrackOrderPage`, `pdfGenerators.ts`, `get_orders_totals` (RPC) — este último soma `preco*quantidade` e **não** considera desconto/acréscimo. Se for desejado refletir o ajuste no totalizador da lista de pedidos (barra de totais), também precisamos ajustar a RPC. **Nota:** o totalizador atual já ignora desconto; manteremos consistência (não mexer agora) — mas avise se quiser que eu inclua o ajuste no total da lista também via nova migration na RPC `get_orders_totals`.

## Resumo de arquivos editados

- `src/pages/OrderDetailPage.tsx` — reordenar seções; trocar card por "Edição de Valor"; suportar acréscimo na exibição da composição.
- `src/lib/order-logic.ts` — `getOrderFinalValue` aceita `desconto` negativo como acréscimo.
- `src/components/SpecializedReports.tsx` — texto do PDF de cobrança diferenciar "Desconto" / "Acréscimo".

## Pergunta antes de implementar

Você quer que o **totalizador da barra de pedidos** (RPC `get_orders_totals` — "Valor total" no topo da lista) também reflita os ajustes de desconto/acréscimo? Hoje ele ignora ambos. Se sim, adiciono uma migration alterando a RPC para subtrair `COALESCE(desconto, 0)` por pedido.