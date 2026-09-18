# Mudança de progresso no detalhe do pedido com as mesmas regras da lista

## Problema

Na tela de detalhe do pedido, a barra "pedido(s) selecionado(s) → Novo progresso → Mudar progresso" muda a etapa direto, sem as travas que existem em "Meus Pedidos":

- a lista de etapas mostra sempre as etapas de bota, mesmo para cinto e extras, e sem filtrar pela ordem de produção;
- não pede justificativa em retrocesso, pausa ("Aguardando") ou cancelamento;
- não oferece o botão "ERRO MONTAGEM" (voltar para Montagem sem cobrar de novo).

## O que muda

A barra de mudança de progresso do detalhe passa a se comportar exatamente como a de "Meus Pedidos":

1. **Etapas válidas**: as opções seguem o tipo do produto (bota, cinto ou extra) e, quando há só um pedido selecionado, apenas as etapas permitidas a partir da etapa atual.
2. **Justificativa obrigatória**: ao mudar para uma etapa anterior, para "Aguardando" ou para "Cancelado", abre a janela de justificativa (mínimo 5 caracteres), que fica registrada no histórico com a marcação [RETROCESSO] / [PAUSA] / [CANCELAMENTO]. Os pedidos sem trava são aplicados na hora.
3. **Erro de montagem**: quando o destino é "Montagem" ou "Montagem Ailton", aparece o botão "ERRO MONTAGEM (motivo opcional — não cobra novamente)", igual ao da lista.
4. **Progresso e bloqueios**: contador X/Y durante a aplicação e o mesmo aviso final listando os pedidos que não puderam mudar de etapa.

Quem enxerga a barra continua igual ao de hoje — nenhum usuário ganha ou perde a permissão.

## Detalhes técnicos

- Extrair a lógica hoje embutida em `src/pages/ReportsPage.tsx` (`handleBulkProgressUpdate`, `handleConfirmRegression`, modal de justificativa, botão ERRO MONTAGEM via RPC `montagem_marcar_erro`, `BlockedItem` dialog) para um componente reutilizável, ex.: `src/components/orders/BulkProgressDialogs.tsx` + hook `useBulkProgressChange`, apoiado em `requiresJustification` (`statusRegression.ts`) e `isTransitionAllowed` / `getAllowedNextStatuses` (`statusTransitions.ts`).
- `ReportsPage.tsx` passa a consumir o mesmo componente/hook, preservando textos, toasts e estados atuais (`bulkProgress`, `blockedDialog`, `finalizeBulkUpdate`).
- `OrderDetailPage.tsx`: a barra de seleção passa a usar o hook; monta a lista de etapas a partir dos pedidos selecionados (`PRODUCTION_STATUSES` / `BELT_STATUSES` / `EXTRAS_STATUSES`) e reaproveita o `BlockedItem` dialog já existente (`bulkBlocked`).
- Como o detalhe só conhece os IDs selecionados, buscar `id, numero, status, tipo_extra, vendedor, historico` dos selecionados antes de abrir o fluxo, para avaliar as travas com os mesmos dados usados na lista.
- Nenhuma mudança de banco ou de regra de preço/cobrança.
