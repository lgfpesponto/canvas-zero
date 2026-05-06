## Objetivo

Mostrar no diálogo de confirmação dos **Relatórios Especializados** (e demais pontos onde fizer sentido) os totais reais antes de gerar o PDF: **quantidade de pedidos**, **quantidade de produtos/pares** e, quando aplicável, **valor total**.

Hoje o modal só lista os filtros — falta o destaque numérico.

## O que muda

### 1. `src/components/SpecializedReports.tsx`

Em `generateReport()` (linha ~1741), antes de chamar `askPrint`, calcular a prévia aplicando exatamente o mesmo filtro que cada `generate*PDF` usa:

- **escalacao / forro / palmilha / forma / pesponto / metais / bordados / corte / cobranca**: filtra `sourceOrders` por `progressoMatches` (e demais critérios do relatório). Calcula:
  - `qtdPedidos = filtered.length`
  - `qtdProdutos = soma de quantidade real` (considerando `bota_pronta_entrega` → `botas.length`, igual à Expedição)
  - `valorTotal = soma de getOrderFinalValue(o)` — exibido em **cobranca**, **expedicao**, **extras_cintos** (relatórios financeiros). Para os de produção (escalação, forro, etc.) mostrar só pedidos+produtos.
- **expedicao**: filtra por status "Expedição" + vendedor → pedidos, pares e valor.
- **extras_cintos**: filtra por `tipoExtra` → pedidos e valor.
- **comissao_bordado**: precisa do RPC `find_orders_by_status_change` (assíncrono). Para não atrasar o modal, mostrar só os filtros (como hoje) + nota "Totais calculados na geração".

Passar os números via `destaque` e `linhas` extras do `ReportConfirmSummary`:

```text
[ TOTAL DE PEDIDOS               137 ]   <- destaque
- Produtos (pares):             412
- Valor total:                  R$ 78.430,00   (só relatórios financeiros)
- Progresso: Entregue
- Vendedor: Rafael Silva
```

### 2. `src/components/common/ReportConfirmSummary.tsx`

Pequena melhoria: aceitar **múltiplos destaques** (array) para mostrar, lado a lado/empilhados, "Pedidos", "Produtos" e "Valor".

```ts
destaques?: { label: string; value: ReactNode }[]
```

Mantém compatibilidade com a prop `destaque` atual.

### 3. Outros pontos já com modal — reforçar números faltantes

Revisar e adicionar `destaques` onde faltarem:

- `src/pages/ReportsPage.tsx` (lista filtrada principal): já tem qtd e valor → migrar para o novo `destaques` (visual mais claro).
- `src/pages/PiecesReportPage.tsx`: pedidos + combinações.
- `src/components/SoladoBoard.tsx`: qtd visível.
- `src/components/CommissionPanel.tsx`: vendas + valor + comissão.
- `src/components/gestao/AuditoriaTab.tsx`: qtd eventos.
- `src/pages/BordadoPortalPage.tsx`: qtd registros.

Sem mudar lógica de geração — só o resumo visual.

## Detalhes técnicos

- Usar `getOrderFinalValue` (já importado) para somar valores — mantém consistência com lista, detalhe e demais PDFs.
- Cálculo de `qtdProdutos` segue a mesma regra da Expedição (linhas 1215-1217): se `tipoExtra === 'bota_pronta_entrega'` usar `extraDetalhes.botas.length`, senão `o.quantidade`.
- Cálculo é **memoizável** mas como roda só no clique do botão "Gerar PDF" (não a cada render), basta computar inline dentro de `generateReport`.
- Nada muda nos PDFs gerados nem nos filtros — só na UI do modal.

## Arquivos editados

- `src/components/common/ReportConfirmSummary.tsx`
- `src/components/SpecializedReports.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/PiecesReportPage.tsx`
- `src/components/SoladoBoard.tsx`
- `src/components/CommissionPanel.tsx`
- `src/components/gestao/AuditoriaTab.tsx`
- `src/pages/BordadoPortalPage.tsx`
