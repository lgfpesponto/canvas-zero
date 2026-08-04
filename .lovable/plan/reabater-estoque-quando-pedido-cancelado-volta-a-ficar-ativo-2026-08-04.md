# Reabater estoque quando pedido cancelado volta a ficar ativo

## O que aconteceu com o pedido KELLY BF 36

O abatimento de estoque está funcionando — o problema foi o cancelamento e a reativação:

1. 04/08 06:24 — Maria Gabriela criou o pedido a partir do Estoque (1 par) e o saldo do produto "Kelly Bico Fino Horse Nescau Bordado Bege 36" foi abatido normalmente.
2. 04/08 07:20 — Fernanda ADM moveu o pedido para **Cancelado** ("A pedido da Denise"). A regra de cancelamento devolveu 1 par ao estoque e marcou o pedido como `estoque_devolvido`.
3. 04/08 09:37 — Fernanda ADM moveu o pedido de volta para **Em aberto**. Nesse caminho **não existe nenhuma regra que abata o estoque de novo**, então o par voltou a aparecer como disponível mesmo com o pedido ativo.

Ou seja: só acontece com pedido de estoque que foi cancelado e depois reaberto. Nenhum outro pedido de estoque foi afetado por outro motivo.

## O que será feito

### 1. Reabater ao sair de "Cancelado"
Criar a regra inversa da devolução: quando um pedido de origem estoque sai de "Cancelado" para qualquer outro progresso e está marcado como devolvido, o sistema abate novamente os pares no estoque, limpa a marca de devolvido e registra no histórico do pedido ("X par(es) reabatido(s) do estoque").

- Se o saldo já estiver em 0 (o par foi vendido para outra pessoa enquanto o pedido estava cancelado), a reativação é bloqueada com mensagem clara informando qual produto/tamanho está sem saldo, para evitar estoque negativo.
- A operação é idempotente: reabate uma única vez, mesmo que o status mude várias vezes.

### 2. Corrigir o caso atual
Ajustar o saldo do produto "Kelly Bico Fino Horse Nescau Bordado Bege — Tam 36" de 1 para 0 e marcar o pedido KELLY BF 36 como abatido, com registro no log de ajustes de estoque para rastreabilidade.

### 3. Varredura de segurança
Verificar se existe outro pedido de origem estoque ativo (fora de Cancelado) ainda marcado como devolvido e aplicar a mesma correção, se houver.

## Detalhes técnicos

- Nova função `public.reabater_estoque_pedido(jsonb)` (espelho de `devolver_estoque_pedido`), com `FOR UPDATE` e validação de saldo.
- Novo trigger `BEFORE UPDATE OF status ON public.orders` disparando quando `OLD.status = 'Cancelado'` e `NEW.status <> 'Cancelado'`, com `origem_estoque = true` e `estoque_devolvido = true`; grava `estoque_devolvido = false` e acrescenta linha no `historico`.
- Migração de dados pontual para o pedido `948e04ee` / produto `39b3c84a`, com inserção em `estoque_ajustes_log`.
- Sem mudanças na Bagy além do fluxo já existente de sincronização de saldo (a fila de estoque é acionada pela própria atualização do produto).
