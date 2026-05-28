## Problema

O frontend já está liberado (editei `src/lib/statusTransitions.ts` no turno anterior), mas o banco tem um trigger `trg_orders_block_manual_pago_cobrado` que rejeita qualquer `UPDATE` em `orders.status` para `'Cobrado'` quando a flag de sessão `app.allow_status_cobrado` não está em `'1'`. Essa flag só é setada dentro da RPC `marcar_pedidos_como_cobrado` (usada pelo PDF de cobrança). Por isso a mudança manual via Progresso de Produção é bloqueada no DB e cai no diálogo "Pedidos não movidos".

## Mudança

Atualizar a função do trigger `trg_orders_block_manual_pago_cobrado` para permitir **exclusivamente** a transição `Conferido → Cobrado`. Toda outra entrada manual em `Cobrado` (ex.: a partir de Entregue, Pesponto, etc.) continua bloqueada, e `Pago` segue 100% bloqueado.

Lógica nova:
- Se `NEW.status = 'Cobrado'` e `OLD.status = 'Conferido'` → permitido (sem precisar da flag).
- Se `NEW.status = 'Cobrado'` com qualquer outro `OLD.status` → continua exigindo `app.allow_status_cobrado='1'`.
- Regra de `Pago` inalterada.

## Implementação

Migration única que faz `CREATE OR REPLACE FUNCTION public.trg_orders_block_manual_pago_cobrado()` com a nova condição. Trigger em si não precisa ser recriado.

```sql
CREATE OR REPLACE FUNCTION public.trg_orders_block_manual_pago_cobrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('Pago','Cobrado') AND OLD.status <> NEW.status THEN
    IF NEW.status = 'Pago'
       AND COALESCE(current_setting('app.allow_status_pago', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Pago" não é permitida...';
    END IF;
    IF NEW.status = 'Cobrado'
       AND OLD.status <> 'Conferido'
       AND COALESCE(current_setting('app.allow_status_cobrado', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Cobrado" só é permitida a partir de "Conferido"...';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
```

## Resultado esperado

No `/relatorios`, ao selecionar pedidos com status "Conferido" e escolher "Cobrado" no modal de Progresso de Produção, todos serão movidos com sucesso (sem cair no diálogo de bloqueio). Regras de auditoria (histórico, observação) continuam aplicadas pelo fluxo normal de `updateOrderStatus`.
