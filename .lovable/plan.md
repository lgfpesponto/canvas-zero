# Por que a Bagy parou de sincronizar depois do "Resincronizar"

## O que está acontecendo (verificado agora)

Estado real do banco neste momento:

- 243 produtos ativos; 146 já com status `ok`, 91 ainda `pendente`, 6 `não encontrado na Bagy`, 0 com erro.
- 97 produtos estão sem `bagy_variation_id` (o vínculo com a variação na Bagy).
- Fila `bagy_stock_sync_queue`: 91 itens pendentes, nenhum com tentativa acumulada.

Nos logs da função `bagy-stock-sync` a sincronização **está rodando agora** (vários `put ok` nos últimos minutos). O problema é outro:

1. O botão envia `force_rediscover: true`, que **apaga o `bagy_variation_id` de todos os produtos**. Sem esse cache, cada SKU precisa ser redescoberto na Bagy testando até 5 endpoints diferentes — e vários respondem 404 antes de acertar. Isso torna cada item lento (2-3 s).
2. Cada chamada da função processa no máximo **50 itens** da fila. O botão chama a função **uma única vez**, então de 243 produtos só 50 são tratados por clique. Os 91 restantes ficam parados até alguém clicar de novo ou o cron passar — dando a impressão de "não sincroniza mais".
3. Não há trava de execução: o botão e o drenador automático podem rodar ao mesmo tempo sobre a mesma fila, refazendo trabalho (nos logs o mesmo `queueId` aparece sendo processado em paralelo).

Ou seja: nada quebrou de fato — a resincronização total ficou lenta e incompleta por desenho.

## Função do botão (definição)

O botão "Resincronizar Bagy" serve **apenas para reenviar o saldo atual de estoque dos produtos ativos para a Bagy**, garantindo que a quantidade lá fique igual à do portal. Ele não altera nada no portal, não muda preços, não cria nem apaga produtos, e não mexe nos vínculos já validados — só empurra o saldo.

## Correções propostas

1. **Botão processa até o fim**: em vez de uma chamada única, o botão enfileira e depois chama a função em ciclo até a fila zerar, mostrando o progresso real ("X de Y sincronizados") no overlay em vez de um spinner mudo.
2. **Não apagar o vínculo por padrão**: `force_rediscover` deixa de ser automático no botão — reenviar saldo não exige redescobrir a variação. O comportamento normal reaproveita o `bagy_variation_id` já validado (a função já detecta e corrige vínculo furado sozinha). Redescoberta total vira uma opção separada dentro do diálogo de confirmação, para casos raros.
3. **Descoberta de SKU mais rápida**: reduzir a lista de endpoints tentados, começando pelo que a Bagy realmente responde, e parar de repetir caminhos que retornam 404 de forma consistente na mesma execução.
4. **Trava de execução**: marcar a execução em `internal_config` (ou uma coluna de "em processamento" na fila) para que duas resincronizações simultâneas não disputem os mesmos itens.
5. **Retomar os 91 pendentes agora**: após o ajuste, disparar o ciclo para terminar a fila atual e relatar os 6 SKUs realmente ausentes na Bagy (esses precisam ser cadastrados lá).
6. **Resumo ao final**: ao terminar, mostrar quantos SKUs tiveram o saldo confirmado na Bagy, quantos falharam e quais não existem lá — deixando claro que o objetivo (estoque igual dos dois lados) foi atingido.


## Detalhes técnicos

- `src/components/estoque/BagyResyncAllButton.tsx`: laço de invocações sequenciais (`while` com limite de segurança), leitura da contagem pendente de `bagy_stock_sync_queue` para exibir progresso, e checkbox "Redescobrir vínculos na Bagy" (envia `force_rediscover`).
- `supabase/functions/bagy-stock-sync/index.ts`: enxugar `bagyGetVariationIdBySku` (memorizar em memória quais caminhos retornaram 404 na execução), retornar `pendentes_restantes` no JSON de resposta para o front controlar o laço, e trava simples de concorrência.
- Sem mudanças de schema além, se necessário, de uma chave em `internal_config` para a trava.

## O que não muda

Saldos, preços e regras de estoque continuam iguais — a alteração é só na forma como a resincronização é disparada e concluída.
