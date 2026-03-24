

## Adicionar Enter para filtrar na página de pedidos

### Problema
Os campos de filtro (nº do pedido, datas, etc.) não respondem à tecla Enter. O usuário precisa clicar no botão "FILTRAR" manualmente.

### Solução
Envolver a seção de filtros (linha 734-843 aprox.) em um `<form>` com `onSubmit` que chama `applyFilters` e previne o comportamento padrão do formulário.

### Alteração

**Arquivo**: `src/pages/ReportsPage.tsx`

- Substituir a `<div>` container dos filtros (linha 734) por um `<form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>`.
- Fechar o `</form>` onde fecha o `</div>` correspondente.
- O botão "FILTRAR" continua funcionando normalmente (já está dentro do form).
- Todos os inputs de texto, data e select passam a disparar `applyFilters` ao pressionar Enter automaticamente pelo comportamento nativo do `<form>`.

