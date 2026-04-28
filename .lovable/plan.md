# Prazo dinâmico nos cards: dias restantes ou dias de atraso

## Comportamento atual
- Cards de pedido (lista, Solado boards) mostram `15d úteis` (ou `5d`/`1d`) — esse número é o **prazo total** salvo em `dias_restantes` no banco, não decrementa.
- Quando o pedido vira "Pago"/"Entregue" etc. ou quando alguém zerou o campo, mostra `✓`.
- "Pedidos em Alerta" do dashboard rotula como "Prazo atingido" usando `diasRestantes === 0` (que quase nunca acontece de verdade).

## Comportamento desejado
- Mostrar **dias úteis restantes** calculados em tempo real a partir da data de criação do pedido (`15` para bota, `5` para cinto, `1` para extras).
- Quando o prazo passar **e** o pedido ainda não estiver em `Expedição`, `Entregue`, `Cobrado` ou `Pago`, mostrar `+Nd atrasado` em vermelho.
- Quando o pedido já estiver em uma dessas etapas finais (ou `Cancelado`), mostrar `✓` (não conta atraso depois de pronto).
- O painel "Pedidos em Alerta" usa o mesmo cálculo: entram pedidos atrasados (não-finais com prazo vencido) ou regredidos. O rótulo "Prazo atingido" vira `+Nd atrasado`.

## Mudanças técnicas

### `src/contexts/AuthContext.tsx`
- Adicionar `businessDaysOverdue(startDate, totalBusinessDays)` ao lado de `businessDaysRemaining`. Conta dias úteis decorridos **além** do deadline; retorna 0 se ainda não venceu.

### `src/lib/orderDeadline.ts` (novo)
- `FINAL_STAGES = ['Expedição', 'Entregue', 'Cobrado', 'Pago', 'Cancelado']`
- `getTotalBizDays(order)` → 15 / 5 / 1 conforme `tipoExtra` (centraliza a lógica que hoje está duplicada).
- `getOrderDeadlineInfo(order)` → `{ daysLeft, daysOverdue, isFinal, isOverdue, label, tone }`
  - `isFinal`: status ∈ FINAL_STAGES
  - `daysLeft`: `businessDaysRemaining(dataCriacao, total)`
  - `daysOverdue`: `businessDaysOverdue(dataCriacao, total)`
  - `isOverdue`: `!isFinal && daysOverdue > 0`
  - `label`: `'✓'` se final, `'+Nd atrasado'` se overdue, senão `'Nd úteis'` (ou `'Nd'` na variante compacta)
  - `tone`: `'success' | 'danger' | 'normal'` para o consumidor escolher cor

### Componentes
- `src/components/OrderCard.tsx` (linha 60): substituir o ternário atual pelo `label` do helper, com classe condicional vermelha quando `tone === 'danger'`.
- `src/components/SoladoBoard.tsx` (linha 255): mesma troca, formato compacto (`5d` / `+3d` / `✓`).
- `src/components/dashboard/AdminDashboard.tsx`:
  - filtro `alertOrders` (linha 185): trocar `o.diasRestantes === 0` por `info.isOverdue` (continua somando os regredidos via histórico).
  - linha 444: substituir "Prazo atingido" por `+Nd atrasado` quando `info.isOverdue`.
- `src/pages/OrderDetailPage.tsx` (linhas 481–484): manter consistente — mostrar `+Nd atrasado` quando aplicável em vez de só "Prazo atingido ✓".

### Memória
- Atualizar `mem://features/production/lead-times` para refletir que o display agora é dinâmico (cálculo a partir de `dataCriacao`), e que `dias_restantes` no banco vira apenas valor inicial de referência.

## Fora de escopo
- **Sem migração de banco.** O campo `dias_restantes` continua existindo e armazenando o valor inicial (15/5/1); todo o display passa a ser derivado.
- Sem mudança em PDFs/relatórios — só interfaces de cards e o painel de alerta.
- Sem feriados: continua usando segunda–sexta como dias úteis (mesma regra de `addBusinessDays` atual).
