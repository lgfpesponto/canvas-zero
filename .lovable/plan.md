Plano para corrigir o bloqueio ao enviar pedido com solado Rústica:

1. Ajustar a validação do novo pedido em `src/pages/OrderPage.tsx`
   - Hoje `Cor da Vira` ainda está sempre na lista de campos obrigatórios.
   - Vou alterar para exigir `Cor da Vira` somente quando `getCorViraOptions(modelo, solado)` retornar opções visíveis.
   - Para Rústica, como o campo fica oculto, ele não será obrigatório.

2. Garantir limpeza dos valores ocultos
   - Ao selecionar Rústica, manter `corSola` e `corVira` como vazio.
   - Isso evita salvar valor antigo/invisível no pedido.

3. Aplicar a mesma proteção em edição, se houver validação semelhante
   - Conferir `src/pages/EditOrderPage.tsx` e ajustar se o mesmo bloqueio existir ao salvar edição.

4. Manter a regra visual atual
   - `Cor da Sola` e `Cor da Vira` continuam sumindo para Rústica.
   - `Formato do Bico` continua restrito a `Quadrado`.

5. Não alterar banco de dados
   - Nenhum dado antigo será apagado; apenas a validação do formulário será corrigida.