## Objetivo

Permitir que vendedores imprimam fichas de produção dos próprios pedidos, na página de Relatórios (`/relatorios`), usando o mesmo gerador de PDF que o admin já usa hoje.

## O que muda

Atualmente o botão **"IMPRIMIR FICHAS"** na página de Relatórios é exibido apenas para administradores. Vamos liberá-lo também para vendedores, mantendo todas as outras restrições (vendedor continua vendo apenas seus próprios pedidos via RLS).

### Comportamento

- O botão aparece para qualquer usuário logado.
- Sem seleção: imprime as fichas de todos os pedidos visíveis (já filtrados na tela).
- Com seleção: imprime apenas os pedidos selecionados.
- Sem restrição por status — vendedor pode imprimir ficha de qualquer pedido próprio.

### Seleção múltipla para vendedores

Hoje a barra "Selecionar todos" e o checkbox no `OrderCard` aparecem só para admin. Para que o vendedor consiga escolher quais fichas imprimir:

- Habilitar a barra "Selecionar todos" para vendedores.
- Habilitar o checkbox de seleção em cada `OrderCard` para vendedores (sem expor ações administrativas como exclusão/alteração de status — essas continuam restritas).

## Mudança técnica

Arquivo: `src/pages/ReportsPage.tsx`

1. Remover o wrapper `{isAdmin && (...)}` ao redor do botão "IMPRIMIR FICHAS" (linhas ~645–651), deixando o botão sempre visível.
2. Remover o wrapper `{isAdmin && (...)}` ao redor da barra "Selecionar todos" (linhas ~668–676).
3. No `<OrderCard>` (linha ~681), passar `isSelected`, `onToggle` mesmo quando não é admin (já passamos), mas garantir que o card mostre o checkbox para vendedor também.

Arquivo: `src/components/OrderCard.tsx`

- Ajustar a renderização do checkbox para aparecer sempre que `onToggle` estiver definido (não só quando `isAdmin`). Ações destrutivas (botão lixeira/`canDelete`) permanecem condicionadas a `isAdmin` + `canDelete`.

## Sem mudanças

- Nenhuma alteração no banco ou em RLS.
- Nenhuma alteração no gerador `generateProductionSheetPDF`.
- Histórico de impressão (`recordPrintHistory`) continua sendo gravado normalmente, agora também com nome do vendedor.
