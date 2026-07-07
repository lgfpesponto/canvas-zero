O erro `column "desconto_solicitado" of relation "order_ajuste_solicitacoes" does not exist` acontece porque a migração que adiciona essa coluna e atualiza as RPCs ainda não foi aplicada no banco.

## Ação

Reaplicar a migração pendente que:

1. **Tabela `order_ajuste_solicitacoes`**
   - Adiciona coluna `desconto_solicitado numeric`
   - Torna `valor_solicitado` opcional (default 0)
   - Atualiza check de status para incluir `'visto'`

2. **RPC `criar_ajuste_solicitacao(_order_id, _desconto, _motivo)`**
   - Grava o desconto em `desconto_solicitado`
   - Bloqueia pedidos de ERRO (`erro_de_pedido_id IS NOT NULL`)
   - Bloqueia duplicata pendente para o mesmo pedido
   - `GRANT EXECUTE TO authenticated`

3. **RPC `marcar_ajuste_visto(_solicitacao_id)`**
   - Só `admin_master` executa
   - Muda status para `'visto'`, grava `decidido_por`/`decidido_em`
   - Insere notificação em `order_notificacoes` para o vendedor
   - `GRANT EXECUTE TO authenticated`

Nenhum código do frontend precisa mudar — ele já está usando os novos nomes; só falta a migração ir pro banco.
