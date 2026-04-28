# Plano

## Remover promoção automática para "Impresso" ao imprimir fichas

**Problema**: Em `src/pages/ReportsPage.tsx`, dentro de `handleGenerateProductionSheetPDF` (acionada pelo botão "Imprimir Fichas"), há um bloco que, quando a usuária é a Fernanda, move automaticamente todos os pedidos exportados que estão em "Em aberto" para o status "Impresso", e mostra um toast de confirmação.

**Correção**: Remover esse bloco. A geração do PDF de fichas não vai mais alterar o status de nenhum pedido — a Fernanda (e qualquer outro usuário) precisa mover manualmente para "Impresso" quando quiser, pelo card de pedido.

## Arquivo afetado

- `src/pages/ReportsPage.tsx` — simplificar `handleGenerateProductionSheetPDF` para apenas gerar o PDF, sem o bloco `if (isFernanda) { ... await updateOrderStatus(..., 'Impresso') ... }`.
