# Confirmação antes de imprimir / gerar PDF

## Objetivo
Quando o usuário clicar em qualquer botão que gere PDF ou ficha para impressão, abrir um diálogo confirmando ("Deseja gerar/imprimir [nome do documento]?") antes de disparar o download. Evita PDFs gerados por engano.

## Pontos identificados que receberão a confirmação

| # | Local | Botão | Ação |
|---|-------|-------|------|
| 1 | `src/pages/ReportsPage.tsx` | **IMPRIMIR FICHAS** | `handleGenerateProductionSheetPDF` |
| 2 | `src/pages/ReportsPage.tsx` | **Relatório por Filtros** (dentro do menu GERAR RELATÓRIO) | `handleGenerateReportPDF` |
| 3 | `src/components/SpecializedReports.tsx` | **GERAR PDF** (Escalação, Forro, Palmilha, Forma, Pesponto, Metais, Bordados, Corte, Expedição, Cobrança, Extras Cintos, Comissão Bordado) | `generateReport` |
| 4 | `src/pages/PiecesReportPage.tsx` | **PDF** (Relatório por Peças) | `exportPDF` |
| 5 | `src/components/SoladoBoard.tsx` | **PDF** (board de solados no dashboard) | `exportPDF` |
| 6 | `src/components/CommissionPanel.tsx` | **Gerar PDF Comissão** | `handleGeneratePDF` |
| 7 | `src/pages/BordadoPortalPage.tsx` | **Gerar PDF resumo** | `gerarPDF` |
| 8 | `src/components/gestao/AuditoriaTab.tsx` | **PDF** (export auditoria) | `exportPDF` |

> Os diálogos da aba Financeiro (upload de comprovante PDF, anexos) não entram — não geram impressão, são apenas anexos.

## Como funcionará (UX)

Ao clicar em qualquer botão acima, abre um `AlertDialog` (shadcn) padronizado:

```
┌─────────────────────────────────────────┐
│  Imprimir Ficha de Produção?            │
│                                         │
│  Serão geradas 12 fichas em PDF para    │
│  download.                              │
│                                         │
│         [ Cancelar ]   [ Imprimir ]     │
└─────────────────────────────────────────┘
```

- Título dinâmico conforme o documento ("Imprimir Ficha de Produção?", "Gerar Relatório por Filtros?", "Gerar PDF de Bordados?", etc.).
- Descrição dinâmica mostrando, quando possível, **quantidade** de itens (ex.: pedidos selecionados, peças, registros).
- Botão primário "Imprimir" / "Gerar PDF" + botão "Cancelar".
- Confirmar dispara a função original; cancelar fecha o diálogo sem efeitos colaterais.

## Implementação técnica

1. **Criar componente reutilizável** `src/components/common/ConfirmPrintDialog.tsx`:
   - Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel` (default "Imprimir"), `onConfirm`.
   - Usa `AlertDialog` já existente em `src/components/ui/alert-dialog.tsx`.
   - Botão de confirmação com ícone `Printer`.

2. **Hook helper** `useConfirmPrint()` (opcional) que retorna `{ confirm(title, description, fn) }` para reduzir boilerplate em páginas com vários botões (caso de `SpecializedReports` que tem 12 tipos de relatório).

3. **Em cada arquivo da tabela acima**:
   - Adicionar estado `pendingPrint` (com título/descrição/callback) ou `useConfirmPrint`.
   - Trocar `onClick={fn}` por `onClick={() => askConfirm(fn, meta)}`.
   - Renderizar `<ConfirmPrintDialog ... />` no final do componente.

4. **Mensagens contextuais**:
   - ReportsPage IMPRIMIR FICHAS → "Imprimir N fichas de produção?"
   - ReportsPage Relatório por Filtros → "Gerar relatório com N pedidos?"
   - SpecializedReports → "Gerar PDF do relatório de {tipo}?" (usa `selectedReport`)
   - PiecesReportPage → "Gerar Relatório por Peças?"
   - SoladoBoard → "Gerar PDF do board {nome}?"
   - CommissionPanel → "Gerar PDF da comissão de {vendedor} ({mês})?"
   - BordadoPortalPage → "Gerar PDF resumo das baixas de bordado?"
   - AuditoriaTab → "Exportar N registros da auditoria em PDF?"

## Não-objetivos
- Não altera a geração do PDF em si (lib `pdfGenerators.ts`, `printHistory`, etc.).
- Não muda exports CSV (apenas impressão/PDF, conforme pedido). Caso queira incluir CSV depois, é trivial.
- Não toca em fluxos do Financeiro que apenas anexam arquivos.
