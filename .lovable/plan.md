## Diagnóstico confirmado

- SKU no portal (`sku_base`) = `texana-west-tribal-couro-nobuck-preto-bordados-branco-36-pronta-entrega-36` — idêntico ao da Bagy ✅
- Portal tinha em cache `bagy_variation_id = 20190869`, mas a Bagy hoje usa `30342522` para essa variação. Cache defasado → PUT no ID errado → nada muda na Bagy.
- `quantidade` local = 3, Bagy = 1 (nunca casou).

## O que fazer

### 1. `bagy-stock-sync` — cache auto-corrigível
- Se `bagy_variation_id` está setado, tentar PUT `/products/variations/{id}/balance` primeiro.
- Se PUT devolver **404** (ou `product/variation not found`): limpar o cache (`bagy_variation_id = null`), procurar de novo por SKU via `GET /products/variations?sku=...`, salvar o novo ID e refazer o PUT.
- Log por SKU: `sku`, `cached_variation_id`, `resolved_variation_id`, status HTTP, corpo de erro.
- Se mesmo após re-descoberta não achar: marcar `bagy_sync_status='nao_encontrado_na_bagy'` com erro descritivo.

### 2. Botão "Sincronizar agora" no produto
- Já passa `retry_produto_id`. Adicionar opção `force_rediscover: true` que zera `bagy_variation_id` antes de sincronizar (útil quando o usuário já sabe que o ID está errado).

### 3. Teste ao vivo com o produto real
Depois do deploy, rodar `bagy-stock-sync` com `{ retry_produto_id: '9abbd51f-b6b5-4103-896c-91ebe4dc7eb3', force_rediscover: true }` e conferir:
- Cache passa de `20190869` → `30342522`.
- Bagy passa de saldo `1` → `3`.
- `bagy_sync_status = 'ok'`.

### 4. (Opcional) Comando admin "Recadastrar todos"
Botão na aba Gestão para varrer todos `estoque_produtos` com Bagy configurado, zerar `bagy_variation_id` e re-descobrir por SKU. Útil se muitos produtos tiverem cache defasado.

## Detalhes técnicos

Arquivos afetados:
- `supabase/functions/bagy-stock-sync/index.ts` — lógica de fallback com re-descoberta em 404.
- `src/components/estoque/EstoqueProdutoConfigButton.tsx` — passar `force_rediscover` num novo botão "Forçar redescoberta".
- (Opcional passo 4) nova página / botão em `src/pages/admin/Gestao*.tsx`.

Nenhuma mudança de schema necessária — as colunas `bagy_variation_id`, `bagy_sync_status`, `bagy_sync_erro`, `bagy_sync_at` já existem.
