## Objetivo

Sincronização automática do estoque do portal ↔ Bagy, casando pelo SKU (idêntico nos dois lados). Subidas e descidas de saldo viram PUT na Bagy em segundos. SKUs não encontrados aparecem com aviso visual no card do produto para vendedor_comissao e admins resolverem.

Status do pedido continua manual pelo botão "Sincronizar com Bagy".

## Fluxo

```text
[UPDATE em estoque_produtos.quantidade]
                │ trigger
                ▼
   bagy_stock_sync_queue (dedupe por estoque_produto_id)
                │
                ▼ pg_cron 1 min + invoke imediato na compra
        edge function bagy-stock-sync
                │
                ├─ bagy_variation_id em cache? → PUT direto
                └─ não? → GET /products/variations?sku=X
                          ├─ achou  → grava cache, PUT
                          └─ não achou → marca SKU como "nao_encontrado_na_bagy"
                                          (aparece aviso amarelo no card)
```

## Mudanças

### 1. Banco (migration)

**`estoque_produtos`** ganha:
- `bagy_variation_id text` — cache do id descoberto pelo SKU
- `bagy_sync_status text` — `ok` | `pendente` | `nao_encontrado_na_bagy` | `erro`
- `bagy_sync_erro text`
- `bagy_sync_at timestamptz`

**Nova tabela `bagy_stock_sync_queue`:**
- `estoque_produto_id uuid` (FK), `sku text`, `novo_saldo int`
- `criado_em`, `processado_em`, `tentativas`, `ultimo_erro`
- índice único parcial em `estoque_produto_id WHERE processado_em IS NULL` (dedupe)

**Trigger `trg_estoque_push_bagy`:**
- AFTER INSERT OR UPDATE OF `quantidade` em `estoque_produtos`
- `INSERT ... ON CONFLICT DO UPDATE SET novo_saldo, criado_em = now()` → 10 mudanças no mesmo SKU em 1 min viram 1 PUT.

**Carga inicial:** enfileirar todos os `estoque_produtos` ativos imediatamente após criar a estrutura (faz UPDATE no-op nas linhas para o trigger disparar).

### 2. Edge function `bagy-stock-sync`

- Lê até 50 itens pendentes ordenados por `criado_em`.
- Para cada item:
  1. Se `bagy_variation_id` vazio → `GET {BAGY_BASE}/products/variations?sku=<sku>`.
     - Achou → grava `bagy_variation_id`, segue.
     - Não achou → `bagy_sync_status = 'nao_encontrado_na_bagy'` + `processado_em = now()` (para de tentar até o usuário clicar "Tentar novamente").
  2. `PUT {BAGY_BASE}/products/variations/{id}` com `{ balance: novo_saldo }`.
  3. Sucesso → `bagy_sync_status = 'ok'`, `processado_em = now()`.
  4. Erro HTTP → `tentativas+=1`, `ultimo_erro`. Após 5 tentativas → `bagy_sync_status = 'erro'` + para.
- CORS, sem JWT (chamada pelo cron com service role).

### 3. Disparo

- `pg_cron` a cada 1 minuto chama `bagy-stock-sync` via `pg_net` (rede de segurança).
- Frontend dispara `supabase.functions.invoke('bagy-stock-sync')` fire-and-forget no botão "Comprar Estoque" e em qualquer outro lugar que mexe no estoque (criação em massa, ajuste manual, devolução por cancelamento). Resultado aparece em segundos.

### 4. UI no card do produto de estoque

Em `EstoqueAdminPanel.tsx` e onde mais o estoque aparece para `vendedor_comissao` / `admin_master` / `admin_producao`:

- **Badge verde "Bagy ✓"** quando `bagy_sync_status = 'ok'`.
- **Badge amarelo "Não está na Bagy — cadastrar SKU X"** quando `bagy_sync_status = 'nao_encontrado_na_bagy'`, com botão **"Tentar novamente"** que reenfileira o SKU e invoca a function.
- **Badge vermelho "Erro de sync"** com tooltip mostrando `bagy_sync_erro`, e mesmo botão "Tentar novamente".
- **Badge cinza "Pendente"** enquanto está na fila.

### 5. Painel resumo em `/rancho-chique/pedidos`

Card "Sincronização de Estoque com Bagy":
- Totais: vinculados / pendentes / não encontrados / erro
- Lista dos SKUs problemáticos com botão "Tentar novamente"
- Botão "Sincronizar todos os SKUs" (reenfileira todos os ativos — útil em manutenção)

## Custo Bagy

Zero adicional. Mesma API "Portal7ESTRIVOS" (R$ 99/mês). O GET de descoberta é 1x por SKU; depois fica em cache.

## Confirma e implemento

Sem mais perguntas — vou implementar exatamente isso assim que aprovar.
