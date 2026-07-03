## Objetivo
Considerar o status "Baixa Estoque" como etapa final/concluída para o prazo de produção, igualando o comportamento de "Baixa Site (Despachado)".

## Alteração
Em `src/lib/orderDeadline.ts`, adicionar `'Baixa Estoque'` na constante `FINAL_STAGES`:

```ts
export const FINAL_STAGES = [
  'Baixa Estoque',
  'Baixa Site (Despachado)',
  'Expedição', 'Entregue', 'Conferido', 'Cobrado', 'Pago', 'Cancelado'
];
```

## Impacto (automático via FINAL_STAGES)
- Pedidos em "Baixa Estoque" param de contar prazo/atrasos.
- Dashboard admin (contagem de "em produção") passa a excluir "Baixa Estoque".
- ReportsPage exclui "Baixa Estoque" dos filtros de pendentes.
- `isAlertOrder` deixa de sinalizar pedidos já baixados no estoque.

## Fora de escopo
Transições de status, permissões e demais telas continuam iguais.