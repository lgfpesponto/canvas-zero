## Ideia: migração "passiva" — sem clique, sem cron, sem edge function

Em vez de rodar um job separado, **a migração acontece sozinha conforme o sistema é usado**, aproveitando consultas que já existem.

### Como funciona

1. **Toda vez que qualquer tela carrega pedidos** (lista, relatório, detalhe, dashboard, PDFs), o resultado já vem com `preco_migrado_v2`. Identificamos os que ainda estão `false` e disparamos, em background (sem bloquear a UI), o recálculo só desses.

2. **O recálculo usa o mesmo `computeTotalToSave`** que já está em produção (mesmo motor da auto-correção do detalhe). Para cada pedido pendente:
   - calcula o total esperado (`subtotal × qtd − desconto`)
   - faz `UPDATE orders SET preco = <novo>, preco_migrado_v2 = true` (só grava `preco` se diverge ≥ R$ 1)

3. **Throttling global** num módulo singleton: processa no máximo **5 pedidos por segundo**, em fila, com deduplicação por `id`. Evita rajadas de UPDATE quando o usuário abre o relatório com 500 pedidos.

4. **Resultado**: os pedidos mais acessados (recentes, em produção, em cobrança) migram nos primeiros minutos de uso. Pedidos antigos e raros migram conforme alguém abrir um relatório que os inclua. Sem ninguém precisar saber que existe migração rodando.

### Por que essa abordagem é boa aqui

- **Zero infra nova**: não cria edge function, não cria cron, não duplica lógica de preço em Deno.
- **Zero clique**: ninguém precisa abrir nada nem lembrar de nada.
- **Seguro**: roda em background com `Promise.allSettled`; se falhar, tenta de novo no próximo carregamento.
- **Auto-acelerado**: quanto mais o sistema é usado, mais rápido migra. Em uso normal, migra 100% em poucos dias.
- **Fallback já garantido**: o runner manual em Configurações continua disponível pra forçar tudo de uma vez se quiser.

### O que muda no código

**Novo arquivo:** `src/lib/precoBackfillQueue.ts`
- Singleton com fila + throttle (5/s), deduplicação por id.
- Método `enqueue(orders, findFichaPrice, getByCategoria)` que filtra `preco_migrado_v2 === false` e empurra na fila.
- Worker assíncrono que faz `UPDATE` lote a lote.

**Hook único:** `src/hooks/usePrecoBackfillBackground.ts`
- Recebe a lista de orders já carregada na tela atual.
- Usa `useFichaVariacoesLookup` + `useCustomOptions` (que praticamente toda tela com pedido já carrega).
- Chama `precoBackfillQueue.enqueue(orders, ...)` num `useEffect`.

**Pontos de plug (4 telas que já carregam pedidos):**
1. `ReportsPage.tsx` — onde o problema do 1951 apareceu
2. `OrderDetailPage.tsx` — já tem auto-correção; passa a usar a fila pra unificar
3. `Dashboard` (ou hook compartilhado de pedidos)
4. `useOrders.ts` / `useOrdersQuery.ts` — se for o ponto comum, basta plugar lá uma vez

**Remover:** o card "Recalcular preços" da aba Relatórios em `AdminConfigPage.tsx` e o componente `RecalcPrecosRunner.tsx` — a fila passiva substitui (ou mantemos escondido como botão de emergência? sugestão: mantém escondido).

### Limites claros

- Pedidos que **ninguém abre nunca** ficam não-migrados pra sempre. Como continuamos lendo `preco` direto e novos pedidos já gravam `preco` correto, isso só importa pros antigos com divergência. Se quiser garantir 100%, basta um admin abrir o relatório "todos os pedidos" uma vez — a fila pega tudo.
- Throttle de 5/s ≈ 300/min ≈ 18 mil pedidos/hora — suficiente pra qualquer carga real.

### Confirmar antes de implementar

- **Throttle de 5 updates/segundo** está bom, ou prefere mais agressivo (ex.: 20/s)?
- **Manter o botão manual** em Configurações como backup, ou remover de vez?
