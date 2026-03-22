
Objetivo: corrigir o prazo mostrado na ficha de produção/formulário para pedidos de ficha "bota", porque ainda há telas usando a regra antiga de 10/30 dias.

Implementação proposta:

1. Ajustar a exibição do prazo em `src/pages/OrderPage.tsx`
- Hoje a tela mostra:
  `Prazo de Produção: {hasAnyLaser ? '30' : '10'} dias úteis`
- Trocar para a regra nova de bota:
  `15 dias úteis`
- Isso garante que, ao criar pedido de bota, a ficha/formulário não continue exibindo o prazo antigo por causa do laser.

2. Ajustar a exibição do prazo em `src/pages/EditOrderPage.tsx`
- Hoje a edição também mostra:
  `Prazo de Produção: {hasAnyLaser ? '30' : '10'} dias úteis`
- Trocar para `15 dias úteis` para manter consistência entre criação, edição e detalhes do pedido.

3. Manter a lógica limitada à ficha “bota”
- Como essas telas são a ficha principal de produção de bota, a mudança deve afetar apenas esse fluxo.
- Não mexer no comportamento de extras e cintos nessas telas sem necessidade.

4. Validar consistência com o restante do sistema
- Confirmar que a página de detalhes já está usando 15 dias úteis.
- Garantir que não reste nenhuma outra exibição visível da regra antiga “10/30 dias” no fluxo de ficha de bota.

Detalhes técnicos:
- Arquivos a alterar:
  - `src/pages/OrderPage.tsx`
  - `src/pages/EditOrderPage.tsx`
- Trecho atual encontrado:
  - `hasAnyLaser ? '30' : '10'`
- Novo comportamento:
  - exibir prazo fixo de `15 dias úteis` para pedidos da ficha de produção bota, independentemente de laser ou bordado.

Resultado esperado:
- Ao criar ou editar uma ficha de produção de bota, o prazo exibido passa a ser 15 dias úteis.
- O prazo antigo deixa de aparecer na ficha.
