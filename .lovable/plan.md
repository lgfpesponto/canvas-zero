## Causa raiz
A migration `20260718224145` (adição do parâmetro `_desconto_aplicado`) reescreveu `public.comprar_estoque` copiando a versão antiga e reintroduzindo `status = 'Pendente'` no `INSERT` e no primeiro item do `historico`. Isso desfez a correção feita em 13/07. Resultado: todos os pedidos de estoque criados pelo portal após 18/07 ~20h saem com o status inválido `'Pendente'`, fora do fluxo de Extras.

O `comprar_estoque_bagy` (webhook) já está correto — por isso pedidos vindos da loja Bagy continuam entrando como `Em aberto`.

## Correção — migration única

1. **Recria `public.comprar_estoque(jsonb, text, text, text, text, jsonb)`** trocando os dois literais `'Pendente'` (INSERT e primeiro item do `historico`) por `'Em aberto'`. Sem outras mudanças de comportamento. Reaplica o `GRANT EXECUTE ... TO authenticated`.

2. **Remove o overload antigo `public.comprar_estoque(jsonb, text, text, text, text)`** (5 args, sem `_desconto_aplicado`) via `DROP FUNCTION IF EXISTS`, para eliminar o risco de a chamada resolver para a versão errada no futuro.

3. **Backfill dos pedidos existentes** afetados:
   ```
   UPDATE orders
      SET status = 'Em aberto',
          historico = jsonb_set(historico, '{0,local}', '"Em aberto"'::jsonb)
    WHERE status = 'Pendente'
      AND (extra_detalhes->>'origem_estoque')::bool = true;
   ```

## Fora do escopo
- Nenhuma mudança no frontend — a chamada `.rpc('comprar_estoque', {...})` continua idêntica.
- `comprar_estoque_bagy` não precisa de mudança.
- `bagy_sync_status = 'pendente'` (fila de sincronização de estoque) é outra coisa e não é tocada.
