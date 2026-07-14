## Ocultar "Comprovantes" do vendedor Rancho Chique

### Alteração
Em `src/hooks/useFinanceiroSaldoAccess.ts`, adicionar `Rancho Chique` à lista de exclusões, para que o item de menu "COMPROVANTES" (Header) e a página `/financeiro/saldo` fiquem indisponíveis para esse usuário.

### Detalhes técnicos
- Novo check: `const isRanchoChique = vendedorName === 'Rancho Chique';`
- Atualizar `canSeeComprovantesView` para incluir `&& !isRanchoChique`.
- Sem mudanças de rota nem em outros componentes — Header e `RevendedorSaldoPage` já reagem ao valor retornado pelo hook.
- Admin master e demais vendedores continuam com o comportamento atual.