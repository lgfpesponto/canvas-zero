## Ajuste na RPC `aprovar_ajuste_solicitacao`

Hoje, ao aprovar uma solicitação de ajuste, a RPC já grava o motivo do vendedor em `orders.desconto_justificativa` (mesmo campo que aparece como "Última justificativa de alteração de valor" no detalhe e sai nos relatórios de cobrança). Falta apenas o prefixo pedido.

### Mudança (migration)

Recriar `public.aprovar_ajuste_solicitacao(_solicitacao_id uuid)` idêntica à atual, alterando apenas:

1. `desconto_justificativa` passa a ser gravado como:
   ```
   'solicitação de ajuste motivo: ' || s.motivo
   ```
2. No item do `historico` do pedido e na notificação enviada ao vendedor, o trecho "Motivo do vendedor: ..." também vira "solicitação de ajuste motivo: ..." para manter a origem clara e consistente em todos os lugares onde o texto aparece.

Nenhuma alteração de schema, RLS ou frontend — o campo já é lido pelo detalhe do pedido e pelos PDFs de cobrança.

### Fora de escopo
- Ajustes feitos manualmente pelo admin (sem passar pela solicitação) continuam salvando a justificativa como já é hoje, sem prefixo.
- Fluxo de recusa permanece inalterado.
