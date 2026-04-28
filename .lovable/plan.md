## Plano

1. Ajustar a regra central de atraso/regressão em `src/lib/orderDeadline.ts`
   - Criar helpers para distinguir:
     - pedido em etapa final atualmente;
     - pedido que já passou por etapa final no histórico;
     - pedido que regrediu após uma etapa final (histórico contém etapa final, status atual não é final);
     - pedido que deve aparecer em alertas de atraso.
   - Manter a exceção do vendedor `Estoque` como “sem prazo”.
   - Garantir que “regrediu” só conte para alerta quando o pedido também estiver atrasado, conforme sua regra.

2. Corrigir o filtro `Apenas atrasados` na página de relatórios (`src/pages/ReportsPage.tsx`)
   - Substituir a busca única limitada a `.range(0, 999)` por busca em lotes, para não perder pedidos extras antigos quando houver muitos registros.
   - Reaplicar todos os filtros juntos em cada lote: data, status, vendedor, clientes virtuais da Juliana, produto e busca textual.
   - Filtrar o resultado final com a regra centralizada de atraso, para que extras como `gravata_country` apareçam corretamente quando estiverem atrasados.

3. Corrigir `Pedidos de Alerta` no dashboard (`src/components/dashboard/AdminDashboard.tsx`)
   - Remover a lógica atual `overdue || regressed` e trocar por uma regra única:
     - mostrar somente pedidos atrasados;
     - incluir tanto os que nunca chegaram em etapa final quanto os que chegaram e depois regrediram.
   - Substituir a busca limitada a `.range(0, 499)` por carregamento em lotes, evitando sumiço de alertas antigos.
   - Continuar excluindo pedidos do vendedor `Estoque`.

4. Validar consistência entre relatório e dashboard
   - Fazer os dois pontos reutilizarem a mesma lógica central para evitar divergência futura.
   - Conferir os cenários:
     - extra atrasado sem etapa final;
     - extra que chegou em etapa final e regrediu, estando atrasado;
     - pedido regredido mas ainda dentro do prazo (não deve aparecer no dashboard);
     - pedido em etapa final sem regressão (não deve aparecer);
     - pedido do vendedor `Estoque` (não deve aparecer).

## Detalhes técnicos

Arquivos previstos:
- `src/lib/orderDeadline.ts`
- `src/pages/ReportsPage.tsx`
- `src/components/dashboard/AdminDashboard.tsx`

Regras a aplicar:
- Etapas finais: `Baixa Site (Despachado)`, `Expedição`, `Entregue`, `Cobrado`, `Pago`, `Cancelado`.
- `Estoque` continua sem prazo de produção.
- Dashboard: `alerta = atrasado && (nunca_finalizou || regrediu_de_final)`.
- Relatórios: `Apenas atrasados = todos os pedidos atrasados`, inclusive extras, respeitando os demais filtros simultaneamente.

Observação importante:
- Hoje há limites fixos de 1000/500 registros nas buscas de atrasados/alertas. Isso é um forte candidato a esconder extras atrasados mais antigos, então a correção precisa eliminar essa limitação com paginação em lotes.