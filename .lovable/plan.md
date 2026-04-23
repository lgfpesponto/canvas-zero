

## Permitir status "Aguardando" para cintos

### Contexto

Hoje, em `src/lib/order-logic.ts`, a constante `BELT_STATUSES` define os status válidos para cintos:

```ts
["Em aberto", "Corte", "Bordado", "Pesponto", "Expedição", "Entregue", "Cobrado", "Pago"]
```

Não existe "Aguardando" na lista, então admins não conseguem mover um cinto para esse estágio (que existe pra botas).

### Mudança

Adicionar `"Aguardando"` em `BELT_STATUSES`, logo após `"Em aberto"`:

```ts
export const BELT_STATUSES = [
  "Em aberto", "Aguardando", "Corte", "Bordado", "Pesponto",
  "Expedição", "Entregue", "Cobrado", "Pago"
];
```

### Arquivo

- `src/lib/order-logic.ts` — uma linha alterada na constante `BELT_STATUSES`

### O que NÃO mexo

- Banco (campo `status` é texto livre, aceita qualquer valor)
- RLS / permissões
- Status de botas (`PRODUCTION_STATUSES`) e extras (`EXTRAS_STATUSES`) — ficam intactos
- Relatórios de produção, dashboards, contadores — "Aguardando" já é tratado nos lugares certos (ex: `PRODUCTION_STATUSES_IN_PROD` e `get_production_counts`)

### Validação (você faz depois)

1. Abrir um pedido de cinto como admin → conferir que o seletor de status agora lista "Aguardando" entre "Em aberto" e "Corte"
2. Mudar um cinto para "Aguardando" → salvar → conferir que aparece no card e no histórico
3. Conferir que botas e extras continuam com seus status originais sem alteração

