## Objetivo

1. Criar etapas **Entrada Laser Ferreni** e **Baixa Laser Ferreni**.
2. Remover etapa **Bordado Dinei**.
3. Mover pedido 8050 → `Entrada Laser Dinei` e pedido 1922 → `Entrada Laser Ferreni`.
4. Refinar UX dos seletores de progresso (single = só válidos; bulk = todos + relatório dos não movidos).

---

## 1. Novas etapas Laser Ferreni

**`src/lib/order-logic.ts`** — adicionar `'Entrada Laser Ferreni'` e `'Baixa Laser Ferreni'` em `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER` e `PRODUCTION_STATUSES_IN_PROD`.

**`src/lib/statusTransitions.ts`** — incluir no fluxo:
- `Baixa Corte` → adicionar `'Entrada Laser Ferreni'`.
- `'Entrada Laser Ferreni': ['Baixa Laser Ferreni']`
- `'Baixa Laser Ferreni': PESPONTOS`

**Migração SQL** — atualizar `get_production_counts` adicionando os 2 novos status no `IN (...)` e removendo `Bordado Dinei`.

## 2. Remover "Bordado Dinei"

- Remover de `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER`, `PRODUCTION_STATUSES_IN_PROD` em `order-logic.ts`.
- Remover de `BAIXA_CORTE_NEXT`, do array de `Estampa` e da chave `'Bordado Dinei': PESPONTOS` em `statusTransitions.ts`.
- Remover do `get_production_counts` (mesma migração).

## 3. Migração de dados (insert tool)

Antes de remover `Bordado Dinei`:

```sql
UPDATE orders SET status='Entrada Laser Dinei',
  historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
    'local','Entrada Laser Dinei',
    'descricao','Migração: pedido movido para Entrada Laser Dinei',
    'usuario','Sistema'))
WHERE numero='8050';

UPDATE orders SET status='Entrada Laser Ferreni',
  historico = ... 'Entrada Laser Ferreni' ...
WHERE numero='1922';

-- Sweep dos demais pedidos em Bordado Dinei:
UPDATE orders SET status='Bordado Sandro',
  historico = ... 'Migração automática: Bordado Dinei descontinuado' ...
WHERE status='Bordado Dinei';
```

> Obs.: o pedido 1922 hoje está com vendedor **Denise Garcia Feliciano** (não Fabiana). Vou mover pelo número conforme solicitado.

## 4. Seletor de status — UX

**`OrderDetailPage.tsx` (linha 548)** — bulk bar do detalhe: manter lista completa (`PRODUCTION_STATUSES`) sem disable; coletar erros de transição e mostrar dialog "Pedidos não movidos".

**Select de progresso individual de um pedido (no detalhe)** — usar `getAllowedNextStatuses(order.status, { vendedor })` em vez de `PRODUCTION_STATUSES`. Sem itens "(indisponível)".

**`ReportsPage.tsx` (1274–1299)**:
- Remover `disabled` e sufixo "(indisponível)"; mostrar todos no bulk.
- Em `handleBulkProgressUpdate`: capturar exceções `TRANSITION_BLOCKED_MESSAGE` por pedido, agregar `{numero, statusAtual}` e exibir `BulkBlockedDialog` no fim:
  - Sucesso total → toast atual.
  - Misto → toast "X movidos" + dialog "Pedidos não movidos: 7E-XXXX (status atual: Y)…".
  - Nenhum → só dialog.

Componente novo: **`src/components/BulkBlockedDialog.tsx`** — Dialog simples com lista, reutilizado em ReportsPage e na bulk-bar do OrderDetailPage.

## 5. Arquivos tocados

- `src/lib/order-logic.ts`
- `src/lib/statusTransitions.ts`
- `src/pages/OrderDetailPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/components/BulkBlockedDialog.tsx` (novo)
- `supabase/migrations/...` — `get_production_counts`
- Operações de dados: 2 UPDATEs específicos + sweep de `Bordado Dinei` → `Bordado Sandro`.

## Confirmação

Pedidos remanescentes em `Bordado Dinei` (fora 8050 e 1922) serão movidos automaticamente para **Bordado Sandro** com entrada de histórico explicando. Se preferir outro destino (`Sem bordado`, `Entrada Bordado 7Estrivos`, etc.), avise antes da execução.
