## Regra confirmada

Você zerou o estoque na Bagy **antes** de sincronizar cada SKU. Portanto, qualquer pedido Bagy cuja data de criação seja **anterior** ao `bagy_sync_at` do produto no portal:

- Já foi contado manualmente como venda da Rancho Chique aqui → criar RC- agora **duplica venda e comissão**.
- Já foi debitado do saldo Bagy antes do zeramento → decrementar aqui **subtrai duas vezes**.

Solução: ignorar esses pedidos por completo no webhook (nem cria pedido portal, nem mexe em estoque) e limpar o que já entrou errado ontem/hoje.

## 1. Correção no webhook `supabase/functions/bagy-webhook/index.ts`

Dentro do loop de itens (linhas ~535-553), ao encontrar `estoqueProdutoId` também trazer `bagy_sync_at` do produto. Depois do loop, calcular:

```
legacyOrder = bagyCreatedAt existe
  && todos os itens com estoqueProdutoId têm produto.bagy_sync_at > bagyCreatedAt
  && nenhum item caiu em template (hasTemplateMatch = false)
```

Quando `legacyOrder === true` **e** `pedidoExistente?.order_id_portal` ainda é null:

- Marcar cada item como `status = 'pre_integracao_ignorado'`.
- **Não** empurrar nada em `estoqueParaComprar` (pula a RPC `comprar_estoque_bagy`, sem baixa e sem RC-).
- **Não** enfileirar `bagy_status_sync_queue` (deixa o pedido Bagy como está).
- Gravar `bagy_pedidos.flag = 'pre_integracao_ignorado'` para aparecer no painel.
- Ainda registra o pedido em `bagy_pedidos` + `bagy_pedido_itens` (histórico e auditoria), só não age.

Pedidos novos (posteriores ao sync) continuam com o fluxo atual intacto.

## 2. Limpeza retroativa (uma migração + insert)

**Diagnóstico primeiro** (só leitura, mostro os números antes de aplicar): listar pedidos `bagy_pedidos` onde `bagy_created_at < MIN(estoque_produtos.bagy_sync_at dos itens vinculados)` que geraram `order_id_portal` nas últimas 72 h.

**Depois aplicar** (uma execução de dados):

1. Para cada pedido portal RC- identificado:
   - Restaurar `estoque_produtos.quantidade += item.quantidade` (por SKU/tamanho do item).
   - Deletar o pedido em `public.orders` (via mesma rotina de exclusão já usada por `admin_master`, para arrastar dependências como `order_status_changes`, `bagy_stock_sync_queue` pendente, etc.).
   - Limpar `bagy_pedidos.order_id_portal` e marcar `flag = 'pre_integracao_ignorado_retroativo'`.
   - Atualizar `bagy_pedido_itens.status = 'pre_integracao_ignorado'` e zerar `order_id_portal`.
2. Deletar da `bagy_stock_sync_queue` qualquer linha pendente gerada pelo trigger de UPDATE de quantidade nesse ajuste (evita eco portal→Bagy que zeraria o saldo Bagy corretamente ajustado por você).
3. Registrar cada restauração em `estoque_ajustes_log` com motivo "Retro-ajuste: pedido Bagy anterior à integração do SKU — venda já contabilizada manualmente antes da sincronização".

Kelly-38 é o caso conhecido; a varredura acha os demais que você viu com 0.

## 3. O que NÃO muda

- RPC `comprar_estoque_bagy`, reconcile job, UI de estoque, criação de novos pedidos Bagy pós-sync.
- Nenhum pedido de vendedor real, nenhum pedido portal manual, nenhuma comissão histórica.
- Regras de RBAC.

## Detalhes técnicos

- Critério per-item usa `bagy_sync_at` do próprio produto (não uma data global), então funciona também quando você cadastrar novos SKUs no futuro.
- `hasTemplateMatch = false` garante que a trava só atinge pedidos 100% de estoque; qualquer pedido de ficha (template) segue o fluxo normal.
- Se um pedido misto (item pré-integração + item novo) aparecer, `legacyOrder` fica false e o webhook processa normalmente — o item pré-integração ainda não decrementa porque não entra em `estoqueParaComprar` (adiciono `if !isPreIntegracao` no push). Ou seja, a proteção também é por item, não só por pedido.
- Antes da limpeza retroativa eu mostro a lista dos pedidos afetados para você confirmar visualmente.
