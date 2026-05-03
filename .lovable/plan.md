## Objetivo
Criar regras explícitas de transição de status de produção (botas), criar 4 novas etapas, bloquear transições inválidas com aviso, tratar Cancelado (zera valor/qtd e restaura ao voltar), e exigir justificativa em qualquer retrocesso na ordem comum.

## 1. Novas etapas

Adicionar em `PRODUCTION_STATUSES` / `PRODUCTION_STATUSES_USER` / `PRODUCTION_STATUSES_IN_PROD` (`src/lib/order-logic.ts`):

- **Entrada Laser Dinei**
- **Baixa Laser Dinei**
- **Estampa**
- *"Sem bordado"* já existe — manter.

Ordem canônica nova (sem Aguardando/Cancelado/Emprestado/Aguardando Couro):

```
Em aberto → Impresso → Corte → Baixa Corte
  → [Entrada Laser Dinei → Baixa Laser Dinei]
  → [Estampa]
  → [Sem bordado]
  → [Bordado Dinei | Bordado Sandro]
  → [Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos]
  → Pesponto (01..05 / Ailton / Pespontando)
  → Montagem → Revisão → Expedição
  → Baixa Estoque | Baixa Site (Despachado)
  → Entregue → Conferido → Cobrado → Pago
```

## 2. Mapa de transições permitidas

Novo arquivo **`src/lib/statusTransitions.ts`** exporta `getAllowedNextStatuses(current, role)` baseado nesta tabela:

```text
Em aberto       → Impresso
Impresso        → Corte
Corte           → Baixa Corte | Aguardando Couro
Aguardando Couro→ Corte
Baixa Corte     → Entrada Laser Dinei | Estampa | Sem bordado
                  | Bordado Dinei | Bordado Sandro | Entrada Bordado 7Estrivos
Entrada Laser Dinei → Baixa Laser Dinei
Baixa Laser Dinei   → Pesponto*  (qualquer pesponto / pespontando / ailton)
Estampa         → Entrada Bordado 7Estrivos | Bordado Dinei | Bordado Sandro | Pesponto*
Sem bordado     → Pesponto*
Bordado Dinei / Bordado Sandro → Pesponto*
Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos
Baixa Bordado 7Estrivos   → Pesponto*
Pesponto 01..05 / Pespontando / Pesponto Ailton → Montagem
Montagem        → Revisão | Expedição
                  | Baixa Site (Despachado)  (apenas vendedor=comissão)
                  | Baixa Estoque            (apenas vendedor=Estoque)
Revisão         → Expedição
Expedição       → Entregue
Entregue        → Conferido
Conferido       → Cobrado
Cobrado         → Pago

Aguardando      → ★ qualquer etapa
Cancelado       → ★ qualquer etapa (com restauração)
Emprestado      → preserva comportamento atual

★ Toda etapa pode ir para "Aguardando" ou "Cancelado".
```

`Baixa Estoque` / `Baixa Site (Despachado)` continuam restritas pelo destino do pedido (vendedor `Estoque` x vendedor comissão), regra já existente — só aparecem na lista se aplicável.

## 3. Validação no momento da troca

Em `updateOrderStatus` (`src/contexts/AuthContext.tsx`) e em `handleBulkProgressUpdate` (`src/pages/ReportsPage.tsx`) e nos selects de status (`OrderDetailPage.tsx` linha 543 e 548):

- Antes de gravar, chamar `isTransitionAllowed(current, next, ctx)`.
- Se não permitido: `toast.error("Progresso indisponível para esse pedido, siga a ordem de produção")` e abortar.
- No `<Select>` da listagem/detalhe, filtrar `PRODUCTION_STATUSES` por `getAllowedNextStatuses(order.status, role, vendedor)` para já não oferecer destinos inválidos. Mantém `Aguardando` e `Cancelado` sempre.

## 4. Justificativa em retrocesso

`src/lib/statusRegression.ts` já cobre retrocesso/pausa/cancelamento usando ordem de `PRODUCTION_STATUSES`.
- Reordenar `PRODUCTION_STATUSES` para refletir a ordem nova (acima) — assim "voltar para etapa anterior" continua disparando o modal de justificativa que o ReportsPage já tem.
- Sair de `Cancelado` para qualquer outra etapa: também tratar como retrocesso → exige justificativa. Ajustar `requiresJustification` para considerar `current === 'Cancelado'` como `'regression'`.
- O fluxo do detalhe (single order) hoje só pede justificativa para Cancelado. Vamos reaproveitar a infra do ReportsPage: extrair os modais (`RegressionConfirm` + `Cancel reason`) num componente `StatusChangeDialog` usado por ambos.

## 5. Cancelado: zerar valor/qtd e restaurar

Mudança em `updateOrderStatus`:

```ts
if (newStatus === 'Cancelado' && order.status !== 'Cancelado') {
  patch.preco_anterior   = order.preco;
  patch.quantidade_anterior = order.quantidade;
  patch.preco = 0;
  patch.quantidade = 0;
}
if (order.status === 'Cancelado' && newStatus !== 'Cancelado') {
  patch.preco      = order.preco_anterior      ?? order.preco;
  patch.quantidade = order.quantidade_anterior ?? order.quantidade ?? 1;
  patch.preco_anterior = null;
  patch.quantidade_anterior = null;
}
```

### Migração SQL
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preco_anterior      numeric,
  ADD COLUMN IF NOT EXISTS quantidade_anterior integer;
```

Snapshot armazenado garante restauração mesmo após reload. Histórico recebe entrada com a justificativa (regressão) ao sair de Cancelado.

## 6. Mensagens / UX

- Toast bloqueio: **"Progresso indisponível para esse pedido, siga a ordem de produção"**.
- No modal bulk, etapas inválidas para todos os pedidos selecionados aparecem desabilitadas com tooltip explicativo (mantém comportamento atual; só desabilitar se 100% inválido).

## 7. Arquivos tocados

- `src/lib/order-logic.ts` — adicionar 3 status e reordenar.
- `src/lib/statusTransitions.ts` — **novo** (mapa + helpers).
- `src/lib/statusRegression.ts` — Cancelado→outro = regression.
- `src/contexts/AuthContext.tsx` — validar transição + snapshot/restore preço/qtd.
- `src/pages/ReportsPage.tsx` — usar `getAllowedNextStatuses` no select da etapa em massa + toast bloqueio.
- `src/pages/OrderDetailPage.tsx` — filtrar select de status (linhas 543 e 548) e tratar bloqueio.
- `supabase/migrations/...` — colunas `preco_anterior`, `quantidade_anterior`.

## Observações
- Regras de comissão / saldo revendedor não mudam: pedido cancelado tem valor 0, então naturalmente sai do A Receber. Trigger `trg_orders_estorno_baixa_on_value_change` já estorna baixa se pedido voltar com novo valor.
- "Sem bordado" continua existindo como status (já está em `PRODUCTION_STATUSES`); só explicitamos transições.
