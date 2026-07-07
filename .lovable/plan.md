## Plano

1. **Ajustar a aprovação da solicitação de valor no banco**
   - Atualizar a RPC `aprovar_ajuste_solicitacao(_solicitacao_id uuid)`.
   - Ao aprovar, salvar no pedido:
     - `desconto` atualizado
     - `preco` atualizado
     - `desconto_justificativa = "solicitação de ajuste motivo: " + motivo do vendedor`
   - Registrar também em `historico` como uma alteração de valor, igual ao fluxo manual do admin, incluindo o motivo com o mesmo prefixo.
   - Registrar em `alteracoes` um item estruturado de auditoria para o histórico de alterações, com valor antes/depois, desconto aplicado e motivo prefixado.

2. **Evitar notificações duplicadas ao vendedor**
   - A aprovação de solicitação vai gerar apenas **uma** notificação ao vendedor.
   - Essa única notificação dirá que a solicitação foi aprovada e qual ajuste foi aplicado.
   - Não haverá notificação separada para “desconto adicionado” e outra para “valor alterado”.

3. **Manter recusa com uma única notificação**
   - Revisar `recusar_ajuste_solicitacao(_solicitacao_id uuid, _resposta text)` para manter só uma notificação dizendo que a solicitação foi negada, com resposta do admin quando existir.

4. **Corrigir compatibilidade com fluxo antigo, se existir**
   - Há uma RPC antiga chamada `decidir_ajuste_solicitacao(...)` que também mexe em ajuste e notificação.
   - Vou atualizá-la para seguir a mesma regra caso alguma tela antiga ainda chame esse fluxo: motivo prefixado quando vier do vendedor e apenas uma notificação.

5. **Verificação**
   - Conferir no pedido usado no teste que o campo `desconto_justificativa` recebe o motivo prefixado.
   - Conferir que o `historico`/`alteracoes` registram o ajuste.
   - Conferir que só uma linha nova é criada em `order_notificacoes` para aprovação/recusa.

## Detalhes técnicos

- Será uma migration Supabase, sem alteração visual obrigatória.
- Não vou alterar ajuste manual feito direto pelo admin master: ele continua salvando justificativa como já salva hoje.
- Não vou criar tabela nova nem alterar permissões/RLS.