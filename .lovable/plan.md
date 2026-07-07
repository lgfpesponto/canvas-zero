## Diagnóstico

`AdminConfigPage` usa `?tab=financeiro` para saber qual seção mostrar. Dentro dela, `FinanceiroInner` também usa `?tab=receber|pagar|saldo` — ao clicar numa aba, o `setSearchParams` sobrescreve `tab=financeiro` por `tab=pagar`, e a página volta para o menu de configurações porque não existe seção `pagar`.

## Correção

**`src/pages/FinanceiroPage.tsx`** — trocar o nome do query param das abas internas de `tab` para `subtab`:

- Ler `searchParams.get('subtab')` no lugar de `'tab'`.
- Em `handleTabChange`, gravar `next.set('subtab', v)` em vez de `'tab'`.

Assim `/admin/configuracoes?tab=financeiro&subtab=pagar` preserva a seção do admin e a aba interna funciona; `/financeiro?subtab=saldo` continua funcionando na página standalone.

## Fora do escopo
- Deep links antigos que usavam `?tab=receber` na URL `/financeiro` — a aba inicial cai no default "A Receber" (comportamento equivalente ao anterior sem parâmetro).

## Arquivo afetado
- `src/pages/FinanceiroPage.tsx`