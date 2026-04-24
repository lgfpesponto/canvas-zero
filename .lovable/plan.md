

## Adicionar status "Cancelado" com motivo obrigatório

### Investigação realizada

- Status são listados em `src/lib/order-logic.ts` (4 constantes: `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `EXTRAS_STATUSES`, `BELT_STATUSES`).
- Mudança de status acontece em **dois lugares apenas**:
  1. `src/pages/ReportsPage.tsx` — modal "Mudar Progresso de Produção" (linhas 711-753). Já tem um campo "Observação (opcional)" em textarea.
  2. `src/pages/OrderDetailPage.tsx` — barra de seleção em massa (linhas 282-321). Não tem campo de observação hoje.
- **Importante**: hoje **não existe** modal que peça motivo obrigatório ao mover para "Aguardando". O que existe é o campo "Observação (opcional)" no modal do ReportsPage. Vou implementar o motivo **obrigatório só para "Cancelado"** (que é o que faz sentido), seguindo o padrão visual desse mesmo modal.

### Mudanças

**1. `src/lib/order-logic.ts`** — adicionar `"Cancelado"` ao final das 4 listas:

```ts
PRODUCTION_STATUSES = [..., "Pago", "Cancelado"];
PRODUCTION_STATUSES_USER = [..., "Pago", "Cancelado"];  // admin only ainda
EXTRAS_STATUSES = [..., "Pago", "Cancelado"];
BELT_STATUSES = [..., "Pago", "Cancelado"];
```

`PRODUCTION_STATUSES_IN_PROD` **não** muda (cancelado não é "em produção"), então não entra nos contadores.

**2. `src/pages/ReportsPage.tsx`** — no modal "Mudar Progresso":
- Quando o status escolhido for `"Cancelado"`, transformar a textarea atual em **obrigatória**:
  - Trocar label para "Motivo do cancelamento *"
  - Trocar placeholder para "Ex: cliente desistiu, pedido duplicado..."
  - Desabilitar botão OK enquanto vazio
  - Em `handleBulkProgressUpdate`, gravar no histórico: `"Cancelado: <motivo>"` em vez do texto padrão.
- Para outros status, comportamento original mantido (observação opcional).

**3. `src/pages/OrderDetailPage.tsx`** — barra de bulk (linhas 282-321):
- Mesmo tratamento: quando `bulkStatus === 'Cancelado'`, abrir um pequeno prompt (ou expandir um input inline) pedindo motivo obrigatório antes de salvar. Sem motivo, não salva.
- Histórico recebe `"Cancelado: <motivo>"`.

**4. Exclusão de cancelados em métricas/relatórios**:
- `get_sales_chart` (RPC) — adicionar `AND status <> 'Cancelado'` na CTE `filtered`. **Migration necessária.**
- `AdminDashboard` — verificar contadores de "pedidos pendentes" e excluir cancelados onde aplicável (vou inspecionar ao implementar).
- `CommissionPanel` — excluir cancelados das contagens de comissão.
- Relatórios PDF (Corte, Pesponto, Bordados, etc.) — naturalmente saem porque os filtros de status atuais não incluem "Cancelado". Sem mudança.
- Lista "Meus Pedidos" — cancelados continuam visíveis (data preservation), com badge cinza pelo `statusColors` default.

### Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.get_sales_chart(...)
-- adicionar na CTE filtered:
AND o.status <> 'Cancelado'
```

### Arquivos editados

- `src/lib/order-logic.ts` — 4 listas
- `src/pages/ReportsPage.tsx` — modal "Mudar Progresso" (motivo obrigatório quando Cancelado)
- `src/pages/OrderDetailPage.tsx` — bulk bar (motivo obrigatório quando Cancelado)
- `src/components/CommissionPanel.tsx` — excluir cancelados
- Migration SQL — `get_sales_chart`

### O que NÃO mexo

- Banco da tabela `orders` (status é texto livre, aceita "Cancelado" sem migration de schema)
- RLS / permissões (admins já podem mudar status)
- Pedidos existentes
- Outros status

### Validação (você faz depois)

1. Selecionar pedidos → "Mudar Progresso" → escolher "Cancelado" → tentar salvar sem motivo → botão fica bloqueado.
2. Preencher motivo → salvar → conferir histórico mostra `"Cancelado: <motivo>"`.
3. Conferir que o pedido cancelado aparece na lista com badge cinza, **não conta** no gráfico de vendas e **não aparece** em relatórios de produção.
4. Mudar para outros status (Aguardando, Corte, etc.) → comportamento original (observação opcional) mantido.

### Pergunta antes de implementar

**Quem pode cancelar?** Mesmo padrão dos outros status (admins via modal de mudança de progresso) ou só `admin_master`? Por padrão vou seguir o atual (admins em geral) — me avise se quiser restringir.

