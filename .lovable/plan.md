

## Ajustar lógica de comissão — meta mínima de 60

### Problema

A barra de progresso para no 60 (100%) e sempre mostra valor de comissão. A regra correta é:
- **60 é o mínimo** para ganhar comissão. Abaixo de 60, comissão = R$0 e não deve ser exibida.
- Acima de 60, a barra continua crescendo (não trava em 100%).

### Alteração: `src/components/CommissionPanel.tsx`

**Lógica:**
- `comissao`: se `vendas < 60` → `0`, senão → `vendas * 10`
- `progresso`: remover o `Math.min(..., 100)` — deixar a barra refletir o progresso real até a meta (mas manter cap em 100 para o componente Progress que aceita 0-100)
- No bloco `bg-muted`: esconder a linha "Comissão: R$X" quando `vendas < 60`

**Mensagem dinâmica (já existe, ajustar):**
- `vendas < 60`: "Faltam X vendas para bater a meta" (sem valor de comissão)
- `vendas >= 60`: "🎉 Meta batida! Comissão atual: R$X" (mostra valor)

**Mudanças específicas:**
1. Linha 66: `const comissao = vendas >= MONTHLY_GOAL ? vendas * COMMISSION_PER_SALE : 0;`
2. Linhas 104-106: Mostrar "Comissão: R$X" somente quando `metaBatida`, senão mostrar "Meta mínima: 60 vendas para ganhar comissão"

