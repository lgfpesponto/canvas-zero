## Adicionar "Produzindo" ao filtro de Progresso da Produção em Meus Pedidos

Hoje, na página `/relatorios` (Meus Pedidos), o filtro "Progresso da Produção" lista somente os status de bota/cinto (`PRODUCTION_STATUSES` ou `PRODUCTION_STATUSES_USER`). O status `Produzindo` é exclusivo dos produtos Extras (`EXTRAS_STATUSES`) e por isso não aparece como opção, mesmo quando existem extras na listagem.

### Mudança

Em `src/pages/ReportsPage.tsx` (linha ~377), montar `allStatuses` incluindo `Produzindo` (de `EXTRAS_STATUSES`), preservando a ordem atual e sem duplicar status que já estejam na lista de botas.

```ts
const statuses = isAdmin ? PRODUCTION_STATUSES : PRODUCTION_STATUSES_USER;
// "Produzindo" é exclusivo de Extras — incluir como opção do filtro.
const allStatuses = Array.from(new Set([...statuses, 'Produzindo']));
```

`EXTRAS_STATUSES` já está importado no topo do arquivo, então alternativamente podemos derivar via `EXTRAS_STATUSES.filter(s => !statuses.includes(s))` para pegar também outros status exclusivos de extras no futuro — mas o pedido foi específico para `Produzindo`, então mantemos a inserção pontual.

### Fora de escopo

- Não mexer em `PRODUCTION_STATUSES` / `PRODUCTION_STATUSES_USER` (afetariam Detalhe do Pedido, regressão de status, dashboards e SoladoBoard).
- Não alterar a lógica de filtragem em si — o `filterStatus` já é um `Set<string>` que casa por igualdade com `order.status`, então marcar "Produzindo" já filtra extras corretamente.
- Não tocar em `SpecializedReports` nem em outras telas.
