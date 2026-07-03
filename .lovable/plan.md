## Mudanças em `src/components/template/TemplatesDialog.tsx`

1. **Dialog largo**: `DialogContent` → `max-w-5xl` (era `max-w-md`) para caber 3 colunas.
2. **Grid 3×2 (6/página)**:
   - `PAGE_SIZE = 6`.
   - Container de cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` (em vez de `space-y-2`).
3. **Card redesenhado** (`TemplateCard`):
   - Foto grande no topo ocupando a largura toda do card (altura `h-40`, `object-cover`) — mesmo tratamento visual de quando cola link.
   - QR code centralizado logo abaixo da foto (ainda dentro do card, `mx-auto`, fundo branco), acima do nome.
   - Nome abaixo do QR (com checkbox à esquerda do nome, badge "Novo" à direita se aplicável).
   - Botão "Preencher" + menu `⋮` mantidos abaixo do nome.
4. **Paginação nas laterais** (não embaixo):
   - Envolver a grid num wrapper `flex items-center gap-2`.
   - Botão `<` à esquerda da grid, botão `>` à direita, ambos com `h-full` (altura da grid) e centralizados verticalmente.
   - Rótulo "Página X de Y" fica abaixo da grid, discreto e centralizado (só rótulo, sem setas).
5. Manter scanner físico, seleção múltipla e demais comportamentos intactos.

## Fora de escopo
- Sem mudanças em `OrderPage.tsx` / `BeltOrderPage.tsx`.
- Sem alteração no modelo de dados nem no PDF.
