# Confirmação detalhada antes de gerar qualquer relatório

## Diagnóstico
Todos os botões de gerar relatório/PDF do sistema já passam pelo diálogo de confirmação `useConfirmPrint` / `ConfirmPrintDialog`. O que falta é o **resumo do que vai sair** dentro do diálogo — hoje a maioria mostra só uma frase genérica como "O PDF será gerado conforme os filtros selecionados".

## Objetivo
Em todo "Gerar PDF/Relatório", o modal de confirmação passa a exibir:
- Tipo do relatório
- Quantidade de pedidos/itens que entrarão
- Filtros aplicados (período, vendedor, status, modelo, etc.)
- Valor total quando fizer sentido (financeiro, comissão)
- Botões Cancelar / Gerar PDF (mantém o atual)

## Telas/botões a ajustar

1. **`/relatorios` — Relatório por Filtros** (`ReportsPage.tsx`)
   - Mostrar: qtd de pedidos, valor total, vendedor, status, período, busca aplicada.

2. **`/relatorios` — Imprimir Fichas de Produção** (`ReportsPage.tsx`)
   - Mostrar: qtd de fichas, vendedor, status, período.

3. **`/relatorios` — Relatórios Especializados** (`SpecializedReports.tsx`)
   - Para cada tipo (Escalação, Forro, Palmilha, Forma, Pesponto, Metais, Bordados, Corte, Expedição, Cobrança, Extras/Cintos, Comissão Bordado): mostrar progresso de produção selecionado, vendedor, período, tipo de produto e — quando o cálculo for barato — quantidade prevista de pedidos.

4. **`/relatorio-pecas`** (`PiecesReportPage.tsx`)
   - Mostrar: campos de agrupamento, qtd de combinações, qtd de pedidos cobertos.

5. **Portal Bordado — Gerar PDF de Baixas** (`BordadoPortalPage.tsx`)
   - Mostrar: período, qtd de baixas, usuários filtrados.

6. **Quadros de Solado (`SoladoBoard.tsx`)**
   - Mostrar: nome do quadro, qtd de pedidos visíveis, status incluídos.

7. **Comissão Mensal (`CommissionPanel.tsx`)**
   - Mostrar: mês, qtd de vendas qualificadas, total de vendas, comissão calculada, status da meta.

8. **Auditoria — Exportar PDF (`AuditoriaTab.tsx`)**
   - Mostrar: período, total de eventos, filtros (tipo, número, usuário, busca).

## Detalhes técnicos

- O `description` do `useConfirmPrint` aceita `ReactNode`. Vou padronizar como uma lista compacta (rótulo + valor) reutilizável.
- Criar um componente leve `ReportConfirmSummary` em `src/components/common/ReportConfirmSummary.tsx` com:
  - props: `qtdPedidos?`, `valorTotal?`, `linhas: { label: string; value: ReactNode }[]`, `nota?: string`.
  - layout: bloco com qtd em destaque + tabela de "rótulo: valor" + nota opcional em cinza.
- Ajustar cada chamada `askPrint(...)` para montar essas linhas a partir do estado de filtros do componente.
- Sem mudanças em PDFs, regras de negócio, banco ou edge functions.

## Resultado esperado
Antes de qualquer PDF sair, a admin vê um modal claro com "isto é o que vai ser gerado" e confirma — evitando relatórios disparados por engano.