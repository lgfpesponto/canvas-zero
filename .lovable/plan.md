## Objetivo
Mover a página "Financeiro" para dentro da tela de **Configurações** do admin master, como mais uma aba — sem quebrar nada, mantendo todas as funcionalidades e links atuais.

## Estratégia
- Extrair o conteúdo interno de `FinanceiroPage` num componente reutilizável `FinanceiroInner` (mesmas 3 sub-abas: A Receber, A Pagar, Saldo do Vendedor).
- Adicionar aba "financeiro" em `AdminConfigPage` (só para `admin_master`), renderizando `FinanceiroInner`.
- Manter a rota `/financeiro` funcionando (renderiza o mesmo `FinanceiroInner` dentro do wrapper existente) — links do Header, NotificacoesBell e AdminDashboard continuam válidos.
- Sem mexer em nenhum componente financeiro (`FinanceiroAReceber`, `FinanceiroAPagar`, `FinanceiroSaldoRevendedor`).

## Alterações

### `src/pages/FinanceiroPage.tsx`
- Extrair o JSX das Tabs num `export const FinanceiroInner` que aceita `initialTab` opcional e faz seu próprio controle via `useSearchParams` (comportamento atual preservado).
- `FinanceiroPage` default export continua igual, envolvendo `FinanceiroInner` com o container/título e o guard de role.

### `src/pages/AdminConfigPage.tsx`
- Importar `FinanceiroInner`.
- Adicionar `<TabsTrigger value="financeiro">` no bloco `admin_master`, com ícone `Wallet` (lucide-react).
- Adicionar `<TabsContent value="financeiro"><FinanceiroInner /></TabsContent>`.

## Fora de escopo
- Nada nas telas de A Receber/A Pagar/Saldo.
- Nenhuma rota removida ou renomeada.
- Sem alteração de permissões ou lógica financeira.