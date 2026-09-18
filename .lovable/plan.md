# Ordem de impressão: couro + cor + modelo

Unificar a sequência das fichas (normal e adesiva) e da lista do portal Corte usando a mesma regra de agrupamento.

## Regra de ordenação

1. Tipo de couro, na prioridade já usada hoje: Crazy Horse, Látego, Nobuck, Fóssil, Floater, Napa Flay, depois os demais em ordem alfabética.
2. Cor do couro (mesma cor junta).
3. Modelo (modelos iguais juntos dentro do mesmo couro + cor).
4. Número do pedido (crescente), como desempate.

Cintos e produtos sem couro de bota caem no final do agrupamento (grupo "sem couro"), ordenados por modelo e número.

## Onde se aplica

- Ficha de produção A5 (botão "Imprimir Ficha").
- Ficha adesiva 10x15 (botão "Imprimir Ficha Adesiva") — hoje sai na ordem que chega, sem ordenação.
- Portal Corte: a lista "Corte" passa a seguir a mesma sequência, para o operador cortar na mesma ordem em que as fichas saem. A lista "Baixa Corte" continua por data de entrada.

## Detalhes técnicos

- Novo `src/lib/orderPrintSort.ts` com `compareOrdersForPrint(a, b)` e `sortOrdersForPrint(list)`, reaproveitando `getCouroSortKey` de `pdfGenerators.ts` (chaves: `couroCano`, `corCouroCano`, `modelo`, `numero`).
- `generateProductionSheetPDF` em `src/lib/pdfGenerators.ts`: substituir o comparador inline pelo compartilhado (acrescenta o critério de modelo).
- `generateFichaAdesivaPDF` em `src/lib/fichaAdesivaPdf.ts`: aplicar `sortOrdersForPrint` após o filtro de bota/cinto.
- `CortePortalPage.tsx`: aplicar `sortOrdersForPrint` no `useMemo` da lista `entrada`.
- Nenhuma alteração de dados, preços ou status.
