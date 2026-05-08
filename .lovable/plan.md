## Objetivo

Recálculo automático e contínuo dos preços antigos, sem precisar clicar em nada. Roda em background sempre que qualquer usuário estiver logado, até zerar a fila de pedidos com `preco_migrado_v2 = false`.

## Como vai funcionar

Hoje já existe a `precoBackfillQueue` (fila passiva), mas ela só processa pedidos que aparecem na tela. Vou adicionar um **drenador global** que busca direto no banco os pedidos pendentes e enfileira automaticamente, sem depender de listagem.

### Comportamento

1. Ao logar (qualquer role, exceto `bordado`), monta um componente invisível `<PrecoAutoBackfill />` dentro do `ChromeWrapper`.
2. Esse componente:
   - Espera os hooks de preço (`useFichaVariacoesLookup`, `useCustomOptions`) carregarem.
   - Faz `SELECT * FROM orders WHERE preco_migrado_v2 = false ORDER BY created_at LIMIT 200`.
   - Empurra o lote pra fila existente (`enqueueBackfill`) — que já processa em ~5/s no cliente.
   - Quando a fila esvazia, busca o próximo lote. Repete até não sobrar nada.
   - Se der erro de rede ou aba ficar inativa, retoma quando voltar (listener `visibilitychange`).
3. Roda 100% silencioso: sem toast, sem UI. O `RecalcPrecosRunner` manual continua existindo como fallback de emergência.

### Garantias

- **Idempotente**: cada pedido é marcado `preco_migrado_v2 = true` assim que processado, então não roda duas vezes nem em sessões diferentes.
- **Sem duplicação entre abas/usuários**: se 2 pessoas estão logadas, ambas processam, mas como o `update` marca a flag, a segunda só vê o que sobrou — no pior caso recalcula igual e grava o mesmo valor.
- **Throttle**: mantém os 200ms entre updates da fila atual, então não estoura rate-limit do Supabase.
- **Não bloqueia a UI**: tudo async em background.

### Arquivos a alterar/criar

```text
src/hooks/usePrecoAutoBackfill.ts    [novo]   loop drenador global
src/components/PrecoAutoBackfill.tsx [novo]   componente invisível que só usa o hook
src/App.tsx                          [edit]   monta <PrecoAutoBackfill /> dentro do ChromeWrapper
                                              (só quando logado e não-bordado)
```

Nada no banco muda. Nenhum PDF muda. O recompute imediato antes do PDF (já implementado) continua funcionando como rede de segurança.

## Resultado esperado

Em poucas horas após o deploy, com qualquer pessoa usando o portal normalmente, todos os pedidos antigos terão `preco_migrado_v2 = true` e o relatório de Cobrança vai bater sempre — sem nunca precisar clicar em "Iniciar recálculo".