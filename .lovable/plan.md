## Por que o portal está lento

O Postgres mostra que **5 queries em `public.orders` consomem ~3 h de CPU acumulada**. A pior, sozinha, foi chamada **17.798 vezes** e gastou ~55 min:

```sql
SELECT vendedor, cliente FROM orders LIMIT ? OFFSET ?
```

Sem `WHERE`, sem `ORDER BY`, sem índice — é varredura full table paginada, repetida toda hora (provavelmente um hook de autocomplete buscando lista de vendedores/clientes). As outras 4 são `SELECT *` em `orders` (96 colunas, JSONBs grandes) com paginação e busca por `ILIKE`.

## Plano de otimização (3 frentes, ordem de impacto)

### 1. Matar a query #1 (maior ganho, ~55 min de CPU/mês)
- Localizar o hook que dispara `SELECT vendedor, cliente FROM orders` sem filtro (busca por `.from('orders').select('vendedor, cliente')` em `src/hooks/` e `src/components/`).
- Substituir por duas queries `DISTINCT` cacheadas via React Query (`staleTime: 5min`):
  - `select distinct vendedor from orders where vendedor is not null order by vendedor`
  - `select distinct cliente from orders where cliente is not null order by cliente`
- Mover para um único hook `useVendedoresClientesAutocomplete()` reutilizado.
- Se mesmo o `DISTINCT` ficar pesado, criar índice parcial (passo 3).

### 2. Cortar payload do `SELECT *` em `orders` (médio impacto)
- Identificar listagens que usam `select('*')` mas só renderizam 8–10 colunas (provavelmente `useOrdersQuery`, `OrderCard`, listas em `ReportsPage`).
- Trocar por `select('id, numero, cliente, vendedor, status, data_criacao, hora_criacao, preco, desconto, tipo_extra, modelo')` (e o que mais a UI usar).
- Para detalhe (`OrderDetailPage`) manter `select('*')` — lá precisa mesmo.

### 3. Índices faltantes (executar como migration)
```sql
-- Acelera ORDER BY default das listagens
CREATE INDEX IF NOT EXISTS idx_orders_data_hora_desc
  ON public.orders (data_criacao DESC, hora_criacao DESC);

-- Acelera filtro por tipo_extra IS NULL OR IN (...)
CREATE INDEX IF NOT EXISTS idx_orders_tipo_extra
  ON public.orders (tipo_extra);

-- Acelera busca por numero
CREATE INDEX IF NOT EXISTS idx_orders_numero_trgm
  ON public.orders USING gin (numero gin_trgm_ops);
-- (requer: CREATE EXTENSION IF NOT EXISTS pg_trgm;)

-- Acelera busca por cliente
CREATE INDEX IF NOT EXISTS idx_orders_cliente_trgm
  ON public.orders USING gin (cliente gin_trgm_ops);
```
Vou rodar `EXPLAIN ANALYZE` antes e depois pra confirmar que o planejador usa os índices.

## Sobre a Florência

Não vou tocar — o "desconto automático" de R$ 5 já não existe como lógica viva (memória "Preço Congelado Removido"). Os 1.113 pedidos que ainda têm `desconto = 5` com justificativa "Florência" são histórico fixo gravado pelas migrations de maio/26. Se você quiser **zerar** esses descontos antigos, me confirma e faço uma migration separada (`UPDATE orders SET desconto = 0, desconto_justificativa = NULL WHERE desconto_justificativa ILIKE '%florência%'`).

## O que NÃO vou fazer

- Não vou refatorar a tabela `orders` (96 colunas) — fora do escopo.
- Não vou mexer no sync Atacado nesta tarefa (problema separado, já diagnosticado: timeout do servidor deles).
- Não vou apagar nem ocultar pedidos com Florência sem confirmação explícita.
