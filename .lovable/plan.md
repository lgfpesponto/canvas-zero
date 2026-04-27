## Problema identificado

Vários pontos do portal exibem **valores zerados** (`R$ 0,00`, `0`, listas vazias) durante o fetch inicial dos dados, dando a impressão errada de que não há informação. Isso acontece porque os `useState` iniciam com `0` / `[]` e o componente renderiza esses valores antes do primeiro `await` retornar.

### Exemplos confirmados

- **AdminDashboard**: `pendingValue`, `productionCounts`, `chartData`, `comprovantesRevendedor`, `storageInfo` — todos exibem 0 antes do RPC retornar.
- **VendedorDashboard / FernandaDashboard**: `pendingValue`, `chartData`, `commissionOrders` — idem.
- **TrackOrderPage**: enquanto `loading=true`, exibe "Carregando..." mas o "Nenhum pedido encontrado" pisca para alguns hooks de filtro.
- **ReportsPage**: já tem `ordersLoading`, mas os contadores no topo (`totalValue`, `totalProdutos`) renderizam zero antes da resposta.
- **FinanceiroSaldoRevendedor**: cards de Total recebido/utilizado/saldo aparecem em 0 antes do `fetchSaldosTodos`.
- **RevendedorSaldoPage**: parte já tem spinner (movimentos), mas o card de saldo aparece zerado primeiro.

## Solução

Criar um padrão consistente: **enquanto `loading === true` (e ainda não houve nenhum dado), exibir spinner ou skeleton em vez do valor**. Não substituir dados antigos por skeleton em refetches (para não "piscar"), apenas no primeiro carregamento.

### Mudanças

**1. Componente reutilizável `LoadingValue`** (novo: `src/components/ui/LoadingValue.tsx`)
- Recebe `loading`, `value`, opcional `className`. 
- Quando `loading && value não definido`: renderiza `<Loader2 className="animate-spin" />` ou um Skeleton fino.
- Caso contrário: renderiza o valor.

**2. AdminDashboard (`src/components/dashboard/AdminDashboard.tsx`)**
- Adicionar flags `pendingLoading`, `productionLoading`, `chartLoading`, `comprovantesLoading`, `storageLoading` (já existe), inicializadas como `true`, marcadas como `false` no `finally` de cada `useEffect`.
- Trocar exibições de `formatCurrency(pendingValue)`, `productionCounts.in_production`, `comprovantesRevendedor.count/total`, `storageInfo` para usar `LoadingValue` (ou bloco com Skeleton para o gráfico).
- Para o `LineChart`: se `chartLoading && chartData.length === 0` → exibir um `<Skeleton className="h-64 w-full" />` no lugar.

**3. VendedorDashboard e FernandaDashboard**
- Mesma abordagem: adicionar flags de loading por consulta e usar `LoadingValue` / Skeleton onde hoje aparecem 0 / listas vazias.

**4. ReportsPage**
- Os contadores `totalValue` e `totalProdutos` no resumo do topo precisam respeitar `ordersLoading` quando ainda não houve resposta (mostrar spinner em vez de R$ 0,00 / 0 itens). Manter valor antigo durante refetch para evitar piscar.

**5. FinanceiroSaldoRevendedor (`src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx`)**
- Os 4 cards de resumo no topo já têm `loading` para a tabela; aplicar o mesmo `loading` aos 4 valores (Total recebido, utilizado, saldo, comprovantes pendentes) — usar `LoadingValue`.

**6. RevendedorSaldoPage (`src/pages/RevendedorSaldoPage.tsx`)**
- Card de saldo no topo: quando `loading=true` e ainda sem dados, exibir spinner em vez de `R$ 0,00`.

**7. FinanceiroAReceber e FinanceiroAPagar** (verificação adicional durante implementação)
- Aplicar mesmo padrão a totalizadores e tabelas que exibam zero/vazio antes do fetch terminar.

### Princípios

- **Primeiro fetch**: mostra loading.
- **Refetches** (filtro mudou, etc.): mantém valor anterior visível para não piscar — só mostra loading se não houver dado prévio.
- **Listas vazias reais** (após carregamento): mantêm a mensagem atual ("Nenhum pedido encontrado", etc.).
- **Sem mudança visual** nos campos que já tinham loading correto (TrackOrderPage, UsersManagementPage, PiecesReportPage etc.).

Nenhuma lógica de cálculo, filtro ou estrutura de dados é alterada — apenas a renderização condicional dos valores enquanto `loading === true` no primeiro carregamento.