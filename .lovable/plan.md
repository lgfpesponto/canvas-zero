# Esperar o carregamento completo antes de gerar relatórios

## Problema

Hoje o número de pedidos mostrado na confirmação do relatório pode sair errado porque a tela ainda está buscando os pedidos no servidor (a busca é feita em lotes de 500). Se o usuário clicar em "Gerar PDF" antes do fim do carregamento, a contagem — e o próprio PDF — usam apenas a parte já carregada.

Pontos afetados:
- Relatórios Especializados (Corte, Palmilha, Escalação, Forro, Cobrança, etc.): usam a lista carregada em lotes, sem travar o botão enquanto carrega.
- Relatório por Filtros e Fichas de Produção (Meus Pedidos): a contagem exibida vem da consulta paginada, que pode estar desatualizada durante o recarregamento dos filtros.

## O que será feito

1. **Travar a geração enquanto carrega**
   Enquanto os pedidos estiverem sendo buscados, o botão de gerar relatório fica desabilitado, com ícone de carregamento e o texto "Carregando pedidos…". Só libera quando todos os lotes terminam.

2. **Contagem sempre real**
   Ao clicar em gerar, o sistema primeiro garante que a lista completa do filtro foi carregada e só então abre a janela de confirmação — com a quantidade exata de pedidos, produtos e valor.

3. **Ícone de carregamento durante a geração do PDF**
   A janela de confirmação passa a mostrar um spinner no botão "Gerar PDF" enquanto o arquivo é montado, com o botão desabilitado, evitando cliques duplicados. A janela só fecha quando o PDF fica pronto (ou dá erro, com aviso).

## Detalhes técnicos

- `src/components/common/ConfirmPrintDialog.tsx` / `useConfirmPrint`:
  - `run` passa a aceitar `() => void | Promise<void>`.
  - Novo campo opcional `prepare?: () => Promise<void>` executado antes de abrir o diálogo (usado para pré-carregar).
  - Estado `running`: botão de confirmação com `Loader2` girando + `disabled`, `AlertDialogCancel` desabilitado, diálogo não fecha por clique fora enquanto roda. Fecha ao terminar; em erro, `toast.error` e o diálogo fecha.
- `src/components/SpecializedReports.tsx`:
  - Botão "Gerar PDF" com `disabled={ordersLoading}` e rótulo/spinner de carregamento; `generateReport()` retorna cedo se `ordersLoading`.
- `src/pages/ReportsPage.tsx`:
  - `askGenerateReportPDF` e `askGenerateProductionSheetPDF`: antes de `askPrint`, aguardam `resolveOrdersForExport()` (com estado local `preparingReport` para spinner no botão) e usam `list.length` como quantidade exibida, passando a lista já resolvida para `run` — sem recarregar de novo na confirmação.
  - Botões de relatório desabilitados quando `ordersLoading || preparingReport`.
- Nenhuma mudança de regra de negócio ou de conteúdo dos PDFs.
