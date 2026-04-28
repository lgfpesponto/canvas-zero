## Proteção contra retrocesso de status (com justificativa)

Sempre que o admin tentar mover um pedido para um status **anterior** ao atual na ordem canônica de produção, exigir confirmação com **justificativa obrigatória**. A justificativa fica gravada no `historico` do pedido (campo `observacao`), aparecendo automaticamente na timeline do pedido.

### Ordem canônica considerada

Sequência de `src/lib/order-logic.ts`:

```
Em aberto → Impresso → Aguardando → Corte → Baixa Corte → Sem bordado →
Bordados (Dinei/Sandro/7E) → Pesponto 01..05 / Pespontando → Montagem →
Revisão → Expedição → Entregue → Cobrado → Pago
```

(`Cancelado` não dispara confirmação — segue o fluxo atual de motivo de cancelamento.)

### Quando dispara

Comparar índice do status atual com o do novo. Se `novo < atual` → retrocesso. Cobre:
- Pago/Cobrado/Entregue → qualquer etapa anterior
- Expedição → qualquer produção anterior
- Qualquer retrocesso entre etapas (ex.: Montagem → Corte)

Avançar nunca dispara.

### UX (`ReportsPage` — "Atualizar progresso em massa")

1. No `handleBulkProgressUpdate`, separar selecionados em `regressoes` e `normais`.
2. Se houver regressões, abrir modal "Confirmar retrocesso de status" com a lista (`#numero — Atual → Novo`) e `textarea` obrigatório (mín. 5 caracteres, validado com zod).
3. Ao confirmar:
   - Regressões → `updateOrderStatus(id, novoStatus, "[RETROCESSO] " + motivo)` (concatena observação opcional original se houver).
   - Normais → seguem com a observação original.
4. Sem regressões, fluxo igual ao de hoje.

### Helper

`src/lib/statusRegression.ts`:
- `STATUS_ORDER` (derivado de `order-logic.ts`)
- `isStatusRegression(current, next)` — true se índice novo < atual (ignora desconhecidos e `Cancelado`)

### Validação

```ts
z.string().trim().min(5, 'Justifique com pelo menos 5 caracteres').max(500)
```

### Arquivos

- **Novo**: `src/lib/statusRegression.ts`
- **Editado**: `src/pages/ReportsPage.tsx`

### Memória

Salvar `mem://features/orders/status-regression-guard` e referenciar no índice.
