## Objetivo
Remover o card "Recalcular preço total dos pedidos antigos" da aba **Relatórios** em `/admin/configuracoes`.

## Mudanças
1. `src/pages/AdminConfigPage.tsx` — remover o import de `RecalcPrecosRunner` e a linha que o renderiza dentro da aba Relatórios (linha 151).
2. `src/components/admin/RecalcPrecosRunner.tsx` — apagar o arquivo (não é mais usado em nenhum outro lugar).

A aba Relatórios passa a mostrar apenas o placeholder "Mais relatórios administrativos em breve.". Nenhuma lógica de cálculo de preço (`src/lib/recomputeOrderPrice.ts`) é tocada — apenas a UI de varredura em massa é removida.
