## Objetivo

Criar uma nova etapa de produção chamada **Conferido**, posicionada entre **Entregue** e **Cobrado** no fluxo:

```text
... → Expedição → Entregue → Conferido → Cobrado → Pago → Garantia
```

Quando o admin_master clicar no checkbox "Conferido" já existente, **se o pedido estiver em "Entregue"**, ele será movido automaticamente para o novo status "Conferido". Vale para botas, extras e cintos.

---

## O que muda

### 1. Banco de dados (migration)

Inserir novo registro em `status_etapas` com `ordem = 21` (entre Entregue=20 e Cobrado=21 antigo) e reordenar os status posteriores (Cobrado→22, Pago→23, Garantia→24, Cancelado→25, Deletado→26).

```sql
INSERT INTO status_etapas (nome, slug, ordem) VALUES ('Conferido', 'conferido', 21);
UPDATE status_etapas SET ordem = ordem + 1 WHERE ordem >= 21 AND slug <> 'conferido';
```

### 2. Listas de status (`src/lib/order-logic.ts`)

Adicionar `"Conferido"` após `"Entregue"` em:
- `PRODUCTION_STATUSES`
- `PRODUCTION_STATUSES_USER`
- `EXTRAS_STATUSES`
- `BELT_STATUSES`

### 3. Permissões

Apenas `admin_master` pode mover pedidos para "Conferido" — adicionar guarda no seletor de status (onde já existe `ADMIN_STATUS_ROLES`) para esconder/bloquear "Conferido" para `admin_producao`.

### 4. Integração com o checkbox "Conferido" (`src/pages/OrderDetailPage.tsx`, ~linha 710)

No `onCheckedChange` do checkbox existente:

- Ao **marcar** (true): atualiza `conferido / conferido_em / conferido_por` E, se o `order.status === 'Entregue'`, também atualiza `status = 'Conferido'` + adiciona entrada no `historico` (data/hora/local/descricao/usuario).
- Ao **desmarcar** (false): apenas remove a flag (não regride status automaticamente, para evitar regressão sem justificativa — segue a regra existente de `Status Regression Guard`).

### 5. Função `tentar_baixa_automatica`

Continua olhando para pedidos em status **'Cobrado'**, então o fluxo automático para "Pago" segue intacto. Nada a mudar aqui.

### 6. Dashboards e relatórios

- `PRODUCTION_STATUSES_IN_PROD` em `order-logic.ts`: **não incluir** "Conferido" (segue mesma regra de "Entregue", que já não conta como "em produção").
- `get_production_counts` (RPC): não precisa alteração — também não conta Entregue/Conferido.
- Métricas de vendas/comissão: "Conferido" é status válido (igual a Entregue/Cobrado/Pago para fins de venda), então o filtro `status <> 'Cancelado'` já cobre.

### 7. Memória

Atualizar `mem://features/orders/conferido-flag` para refletir que o checkbox agora também move o status para "Conferido" quando o pedido está em "Entregue".

---

## Resumo do comportamento final

| Ação no checkbox | Status atual do pedido | Resultado |
|---|---|---|
| Marcar ✅ | Entregue | flag = true + status vira **Conferido** + histórico |
| Marcar ✅ | Qualquer outro | apenas flag = true (não mexe em status) |
| Desmarcar ❌ | Qualquer | apenas flag = false (status preservado) |

E o status "Conferido" também aparece manualmente no seletor de status do admin_master para todos os tipos (botas/extras/cintos), permitindo mudança direta.
