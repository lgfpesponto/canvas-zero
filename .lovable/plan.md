## Diagnóstico

Pedido da Cleidiane (Bagy `17824733566050`, portal `RC-17824733566050`) **foi salvo no portal** (`orders.bagy_order_id=50012748` populado), mas as tabelas Bagy ficaram travadas:

- `bagy_pedido_itens.status` = `aguardando_ficha` (deveria ser `ficha_gerada`)
- `bagy_pedido_itens.order_id_portal` = `null` (deveria apontar pro portal)
- `bagy_pedidos.flag` = `aguardando_ficha` (deveria ser `pedido_criado`)
- nada foi enfileirado em `bagy_status_sync_queue` → Bagy continua em `approved`

Por isso a lista ainda mostra "Gerar ficha".

**Causa raiz**: `bagy_status_sync_queue` **não tem política de INSERT** (só `SELECT`). O `try/catch` em `OrderPage.confirmOrder` engole o erro silenciosamente, e como o insert da fila vem depois dos updates, qualquer falha de policy em qualquer um dos passos derruba os subsequentes sem aviso.

## Correções

### 1. Consertar o pedido da Cleidiane agora (data fix)

Aplicar diretamente:

```sql
UPDATE public.bagy_pedido_itens
   SET status='ficha_gerada',
       order_id_portal='36f7cb06-762a-4876-87c2-636a3591025a'
 WHERE id='e53fc6da-1dac-4271-90cf-82a9dd0a79fe';

UPDATE public.bagy_pedidos
   SET flag='pedido_criado',
       order_id_portal='36f7cb06-762a-4876-87c2-636a3591025a'
 WHERE id='690ba8f6-8c9e-4927-82f7-95caf6d2f509';

INSERT INTO public.bagy_status_sync_queue (bagy_order_id, target_status)
VALUES ('50012748', 'production');
```

Em seguida, chamar `bagy-status-push` com `order_ids=['36f7cb06-762a-4876-87c2-636a3591025a']` pra empurrar pra Bagy.

### 2. Política de INSERT/UPDATE em `bagy_status_sync_queue`

Migration adicionando policies que permitem `admin_master`/`admin_producao`/`vendedor_comissao` inserir e atualizar (drenagem feita pela edge function com service role continua funcionando):

```sql
CREATE POLICY bagy_status_sync_insert_authorized
  ON public.bagy_status_sync_queue FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin_master')
    OR has_role(auth.uid(),'admin_producao')
    OR has_role(auth.uid(),'vendedor_comissao')
  );

CREATE POLICY bagy_status_sync_update_authorized
  ON public.bagy_status_sync_queue FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin_master')
    OR has_role(auth.uid(),'admin_producao')
    OR has_role(auth.uid(),'vendedor_comissao')
  );
```

Também ampliar `bagy_pedido_itens_update` e `bagy_pedidos_update` para incluir `admin_producao` (hoje só `admin_master`), para que qualquer admin que gere ficha consiga marcar a flag.

### 3. Trigger de segurança (à prova de bug do client)

Trigger `AFTER INSERT OR UPDATE OF bagy_order_id ON public.orders` que, quando `bagy_order_id` é setado:

- atualiza `bagy_pedido_itens.status='ficha_gerada'` e `order_id_portal=NEW.id` para o(s) item(ns) `aguardando_ficha` daquele `bagy_order_id`;
- atualiza `bagy_pedidos.flag='pedido_criado'` se todos os itens elegíveis estiverem resolvidos;
- insere em `bagy_status_sync_queue (bagy_order_id, target_status='production')` se ainda não houver linha pendente.

Assim, mesmo que o pós-save do `OrderPage` falhe, a ligação acontece no banco.

### 4. Tornar o erro visível (frontend)

Em `src/pages/OrderPage.tsx` (linhas 1117-1136): trocar o `catch` silencioso por `toast.error('Falha ao sincronizar Bagy: ...')` e logar o `error` retornado por cada `update/insert` do Supabase (hoje só o throw é capturado; erros de RLS retornam `{ error }` sem throw). Verificar `.update(...).select()` ou checar `error` para reportar.

## Detalhes técnicos

Arquivos/migrations:

- Migration: policies novas em `bagy_status_sync_queue`; ampliar policies de UPDATE em `bagy_pedidos`/`bagy_pedido_itens`; criar função+trigger `bagy_link_orders_after_save`.
- Data patch via tool de insert (SQL acima) + chamada `bagy-status-push` para o pedido da Cleidiane.
- Edit: `src/pages/OrderPage.tsx` post-save Bagy — checar `error` de cada call e exibir toast em vez de engolir.

## Fora de escopo

- Layout/UX do `BagyFichaDialog`.
- Mapeamento de SKU, NF, etiqueta.
