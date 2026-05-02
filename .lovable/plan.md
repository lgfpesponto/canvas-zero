## Objetivo

Refinar o sistema de justificativas e ajuste de valor:

1. **Totalizador da lista de pedidos** (RPC `get_orders_totals`) reflete desconto/acréscimo.
2. Na **Composição do Pedido** (tela e PDF de cobrança), mostrar **apenas a ÚLTIMA justificativa que afetou valor** (seja de edição de campo monetário, seja do card "Edição de Valor").
3. **Histórico de Alterações**: mostrar **TODAS** as justificativas (mesmo as que não alteraram valor) — confirmar/garantir comportamento.
4. A justificativa do botão "Aplicar Desconto/Acréscimo" deve sair também na **Composição** e no **PDF de cobrança** (atualmente sai via `descontoJustificativa` + linha de `Desconto/Acréscimo`; vamos unificar com as demais via `alteracoes.afetouValor`).

## Mudanças

### 1. Migration: RPC `get_orders_totals`

Atualizar o `valor_total` para subtrair `COALESCE(desconto, 0)` por pedido (positivo = desconto, negativo = acréscimo somando). Manter assinatura, parâmetros e demais colunas (`total_pedidos`, `total_produtos`).

```sql
SELECT
  COUNT(*)::bigint,
  COALESCE(SUM(...), 0)::bigint,                                 -- total_produtos (sem mudança)
  COALESCE(SUM(
    GREATEST(
      COALESCE(preco, 0) * COALESCE(quantidade, 1) - COALESCE(desconto, 0),
      0
    )
  ), 0)::numeric AS valor_total
FROM filtered;
```

Mesma fórmula é usada no `ReportsPage.tsx` (linha 339, comentário "mesma fórmula da RPC"). Atualizar lá também para somar `getOrderFinalValue` por pedido (ou subtrair `desconto`). Verificar e ajustar.

### 2. `src/pages/OrderDetailPage.tsx` — Composição

Substituir o bloco "Justificativas de alterações de valor" (linhas 839-849) por exibir **apenas a última**:

```tsx
{(() => {
  const ultima = [...justificativasValor].pop(); // último grupo afetouValor com justificativa
  if (!ultima) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Última justificativa de alteração de valor
      </p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">{formatDateBR(ultima.data)} às {ultima.hora} — {ultima.usuario || '—'}:</span>{' '}
        <span className="italic">{ultima.justificativa}</span>
      </p>
    </div>
  );
})()}
```

Como a JustificativaDialog também é acionada pelo card "Edição de Valor" (já adicionamos `afetouValor: true` ao registrar), a última justificativa cobre ambos os casos (campos monetários alterados via edição normal **e** uso do botão Edição de Valor).

Remover também a linha que mostra `order.descontoJustificativa` solto na seção de Desconto/Acréscimo (vira redundante com a "Última justificativa"). Manter apenas a barra Desconto/Acréscimo + Total final.

### 3. `src/components/SpecializedReports.tsx` — PDF de Cobrança

No `compText` (linhas 1392-1405), substituir o loop que adiciona TODAS as justificativas afetuValor por apenas a **última**:

```ts
// Última justificativa que afetou o valor
const ultimaJust = [...(o.alteracoes || [])]
  .reverse()
  .find(a => a.afetouValor && a.justificativa);
const justifLines: string[] = ultimaJust
  ? [`Motivo (${ultimaJust.data} por ${ultimaJust.usuario || '—'}): ${ultimaJust.justificativa}`]
  : [];
```

Remover o sufixo `(${o.descontoJustificativa})` da linha "Desconto/Acréscimo" para evitar duplicação (a justificativa fica somente na linha "Motivo:" abaixo).

### 4. `src/pages/OrderDetailPage.tsx` — Histórico de Alterações

Confirmar que continua exibindo TODAS as justificativas (já faz via `g.justificativa` nas linhas 1118-1120). Sem mudança de código necessária — apenas validar visualmente. **Importante:** edições antigas (pré-feature) não terão `justificativa`, então só não aparecerá "Motivo:" nelas — comportamento esperado.

## Resumo de arquivos editados

- **Migration SQL** — atualizar RPC `get_orders_totals` para descontar/somar `desconto` no `valor_total`.
- `src/pages/ReportsPage.tsx` — alinhar fórmula local do totalizador (linha 339+) com a RPC.
- `src/pages/OrderDetailPage.tsx` — composição mostra apenas última justificativa de valor; remover linha redundante de `descontoJustificativa`.
- `src/components/SpecializedReports.tsx` — PDF cobrança mostra apenas última justificativa de valor; remover duplicação do `descontoJustificativa` no rótulo.

## Confirmação

Posso executar a migration da RPC `get_orders_totals` e aplicar as mudanças acima?