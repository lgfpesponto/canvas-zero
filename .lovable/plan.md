# Novo progresso "Erro" para pedidos de registro de erro

## Objetivo

Pedidos ERRO (registros de erro criados a partir de um pedido original) hoje nascem em "Em aberto" e entram no fluxo normal de produção. Passam a nascer em um progresso próprio chamado **Erro**, de onde é possível mudar para qualquer outro progresso.

## Comportamento

- Nova etapa **Erro** na lista de progressos (botas, cintos e extras), exibida com destaque vermelho como o "Cancelado".
- Ao registrar um erro pelo botão "Registrar Erro" no detalhe do pedido, o pedido ERRO criado já entra com progresso **Erro** (em vez de "Em aberto").
- A partir de **Erro** é permitido ir para qualquer etapa (sem bloqueio de fluxo e sem exigir justificativa de retrocesso), igual ao comportamento de saída de "Aguardando"/"Cancelado".
- **Erro** não é destino automático de nenhuma etapa: só é definido na criação do registro de erro ou manualmente pelo admin.
- Continua valendo a regra atual: prefixo ERRO segue excluído das métricas de venda/comissão.
- Pedidos ERRO existentes que ainda estão em "Em aberto" serão movidos para o novo progresso **Erro** (um único ajuste de dados, sem tocar nos que já avançaram).

## Detalhes técnicos

- `src/lib/order-logic.ts`: incluir "Erro" em `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `EXTRAS_STATUSES` e `BELT_STATUSES` (posição inicial, antes de "Em aberto").
- `src/lib/statusTransitions.ts`: adicionar `'Erro': []` nos mapas FLOW/EXTRAS_FLOW/BELT_FLOW e incluir "Erro" em `FREE_FROM`; não entra em `ALWAYS_AVAILABLE` nem em `MANUALLY_BLOCKED`.
- `src/lib/statusRegression.ts`: tratar "Erro" fora da ordem canônica (como "Cancelado"), para não pedir justificativa ao sair dele.
- `src/components/orders/RegistrarErroDialog.tsx`: `payload.status = 'Erro'` e histórico inicial com essa etapa.
- Tabela `status_etapas`: inserir a etapa "Erro" com ordem própria, para filtros/relatórios que leem do banco.
- Ajuste de dados: `UPDATE orders SET status='Erro'` para pedidos com `erro_de_pedido_id` não nulo e status atual "Em aberto".
- Conferir cores/badges de status nas listagens e no detalhe para dar ao "Erro" o mesmo tratamento visual de alerta.
