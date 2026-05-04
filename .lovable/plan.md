## Mudança

Cinto passa a usar o **mesmo fluxo de produção da bota**, com uma única diferença: **não tem etapa "Montagem"**. Após pesponto, vai direto para Revisão/Expedição/Baixa Estoque/Baixa Site (Despachado).

### Fluxo do cinto (novo, espelhando bota sem Montagem)

```
Em aberto → Impresso → Corte → {Baixa Corte | Aguardando Couro}
Aguardando Couro → Corte
Baixa Corte → {Entrada Laser Dinei | Entrada Laser Ferreni | Estampa | Sem bordado | Bordado Sandro | Entrada Bordado 7Estrivos}
Entrada Laser Dinei → Baixa Laser Dinei → Pespontos
Entrada Laser Ferreni → Baixa Laser Ferreni → Pespontos
Estampa → {Entrada Bordado 7Estrivos | Bordado Sandro | Pespontos}
Sem bordado / Bordado Sandro → Pespontos
Entrada Bordado 7Estrivos → Baixa Bordado 7Estrivos → Pespontos
Pesponto 01..05 → Pespontando
Pesponto Ailton → {Revisão | Expedição | Baixa Estoque | Baixa Site (Despachado)}
Pespontando → {Revisão | Expedição | Baixa Estoque | Baixa Site (Despachado)}
Revisão → Expedição
Expedição → {Entregue | Baixa Site (Despachado) | Baixa Estoque}
Baixa Estoque → Entregue
Baixa Site (Despachado) → Entregue
Entregue → Conferido → Cobrado → Pago
Aguardando / Cancelado: sempre disponíveis
Emprestado → {Corte | Em aberto}
```

`BELT_STATUSES` (lista usada na UI) também passa a refletir as mesmas etapas de bota, **menos Montagem**.

## Migração de dados (cintos existentes)

Migration SQL para migrar pedidos de cinto com status genérico antigo:
- `status = 'Pesponto'` AND `tipo_extra = 'cinto'` → `Pespontando`
- `status = 'Bordado'` AND `tipo_extra = 'cinto'` → `Entrada Bordado 7Estrivos`

A migração também adiciona uma entrada no `historico` JSONB de cada pedido afetado registrando a alteração automática (data, motivo "Migração: novo fluxo de cinto", status anterior).

## Arquivos alterados

### `src/lib/order-logic.ts`
Substituir `BELT_STATUSES` pela lista completa (igual `PRODUCTION_STATUSES_USER` sem "Montagem"):
```ts
export const BELT_STATUSES = [
  "Em aberto", "Impresso", "Aguardando", "Aguardando Couro", "Emprestado",
  "Corte", "Baixa Corte",
  "Entrada Laser Dinei", "Baixa Laser Dinei",
  "Entrada Laser Ferreni", "Baixa Laser Ferreni",
  "Estampa", "Sem bordado",
  "Bordado Sandro", "Entrada Bordado 7Estrivos", "Baixa Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05",
  "Pesponto Ailton", "Pespontando",
  "Revisão", "Expedição",
  "Baixa Estoque", "Baixa Site (Despachado)",
  "Entregue", "Conferido", "Cobrado", "Pago", "Cancelado"
];
```

### `src/lib/statusTransitions.ts`
Adicionar `BELT_FLOW` (cópia do `FLOW` de bota, sem `Montagem`; `Pespontando`/`Pesponto Ailton` → `[Revisão, Expedição, Baixa Site (Despachado), Baixa Estoque]`).

Atualizar `pickFlow(ctx)`:
- `ctx?.tipoExtra === 'cinto'` → `BELT_FLOW`
- `isPureExtra(ctx)` → `EXTRAS_FLOW`
- caso contrário → `FLOW`

### `src/pages/ReportsPage.tsx`
No bloco do modal de progresso, remover a exceção `!== 'cinto'` para que o filtro de etapas válidas via `isTransitionAllowed` também seja aplicado a cintos:
```ts
if (selectedOrders.length === 1) {
  const o = selectedOrders[0];
  statusList = statusList.filter(s => isTransitionAllowed(o.status, s, { vendedor: o.vendedor, tipoExtra: o.tipoExtra }));
}
```

### Migration SQL (nova)
```sql
UPDATE orders
SET
  status = CASE status
    WHEN 'Pesponto' THEN 'Pespontando'
    WHEN 'Bordado'  THEN 'Entrada Bordado 7Estrivos'
  END,
  historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_object(
    'local', CASE status WHEN 'Pesponto' THEN 'Pespontando' ELSE 'Entrada Bordado 7Estrivos' END,
    'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'usuario', 'Sistema (migração)',
    'observacao', 'Migração automática: novo fluxo de cinto (status anterior: ' || status || ')'
  )
WHERE tipo_extra = 'cinto' AND status IN ('Pesponto', 'Bordado');
```

### `mem://features/orders/status-transitions-flow`
Atualizar seção "Cintos": descrever `BELT_FLOW` (= bota sem Montagem; Pesponto 01-05 → Pespontando; Pespontando/Ailton → Revisão/Expedição/Baixa).

### `mem://features/orders/belt-specification-logic`
Adicionar nota: "Fluxo de produção do cinto = fluxo da bota sem 'Montagem'. Pesponto Ailton/Pespontando vão direto para Revisão/Expedição/Baixa. Status genéricos legados 'Pesponto' e 'Bordado' foram migrados em maio/2026."

## Resultado

- Pedidos de cinto antigos em "Pesponto" passam a "Pespontando"; em "Bordado" passam a "Entrada Bordado 7Estrivos" — com registro no histórico.
- Modal de progresso mostra todas as etapas reais (Corte, Bordado, Pespontos…) também para cintos.
- Pesponto 01..05 só vai para Pespontando; Pespontando/Pesponto Ailton vão direto para Revisão/Expedição/Baixa (sem Montagem).
- Retrocessos continuam permitidos com modal de justificativa.
