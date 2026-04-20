

## Numeração de páginas em todos os PDFs

Adicionar um carimbo "Página X-Y" no topo de cada página de todos os relatórios PDF — para você nunca perder folha de produção.

## Como vai aparecer

- **Posição**: canto superior direito de cada página (não atrapalha cabeçalho do relatório)
- **Formato**: `Página 1-3`, `Página 2-3`, `Página 3-3` (exatamente como você pediu — separador `-`)
- **Estilo**: fonte pequena (8pt), cinza, discreta — só pra conferência
- **Aplicado em todas as páginas** do PDF, inclusive a primeira

## Onde vai entrar

Crio uma função utilitária `stampPageNumbers(doc)` em `src/lib/pdfGenerators.ts` que:
1. Lê o total de páginas com `doc.internal.pages.length - 1` (jsPDF guarda número correto)
2. Itera de 1 até N, faz `doc.setPage(i)` e desenha `Página i-N` no canto superior direito, respeitando a largura da página (funciona em A4 retrato, A4 paisagem e A5 paisagem da Ficha Sagrada)
3. É chamada **uma única vez, logo antes de `doc.save(...)`** em cada gerador

## Geradores que recebem o carimbo

Vou inserir a chamada `stampPageNumbers(doc)` antes do `save` em todos esses pontos:

**`src/lib/pdfGenerators.ts`**
- `generateReportPDF` (Relatório de Pedidos)
- `generateProductionSheetPDF` (Fichas de Produção A5 — layout sagrado)
- `generateCommissionPDF` (Comissão Rancho Chique)

**`src/components/SpecializedReports.tsx`** (12 geradores diferentes)
- Escalação, Forro, Palmilha, Forma, Pesponto, Metais, Bordados, Corte, Expedição, Cobrança, Extras Cintos, e demais variantes que usam `new jsPDF(...)`

**`src/components/SoladoBoard.tsx`**
- Exportação dos quadros de solado

**`src/pages/PiecesReportPage.tsx`**
- Relatório por Peças

## Detalhes técnicos

- A função se adapta ao tamanho da página via `doc.internal.pageSize.getWidth()` — funciona em qualquer formato/orientação sem ajuste manual
- Como o stamp roda **no final**, ele pega o total real de páginas mesmo nos relatórios que adicionam páginas dinamicamente conforme o conteúdo
- Zero impacto no layout existente (apenas escreve no espaço livre do topo direito, ~10mm da borda)
- A "Ficha Sagrada" (A5 paisagem, uma ficha por página) também ganha — útil quando você imprime várias e precisa conferir se imprimiu tudo

## O que NÃO mexo

- Nenhum layout, nenhuma tabela, nenhum cabeçalho existente
- Padrão de nomes de arquivo continua igual
- Lógica de quebra de página continua igual

## Validação (você faz depois)

1. Gerar Ficha de Produção com 5+ pedidos → conferir `Página 1-N`, `2-N`... no topo direito
2. Gerar relatório de Bordados ou Corte com várias páginas → idem
3. Gerar Relatório por Peças → idem
4. Gerar PDF que cabe em 1 página só → deve mostrar `Página 1-1`

