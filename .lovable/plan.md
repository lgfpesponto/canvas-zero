## Diagnóstico

Os dois problemas têm a mesma raiz: tudo o que sabemos sobre "quando o pedido mudou de etapa" está empilhado dentro de `orders.historico` (um JSONB enorme, com duplicatas, sem índice por status+data).

1. **Filtro "Mudou para" com duas datas — lento / às vezes vazio**
   A RPC `find_orders_by_status_change` faz `jsonb_array_elements(historico)` em todo pedido cujo histórico contém o status. Para status comuns (Corte, Em aberto, Conferido) isso bate em milhares de pedidos, estoura o `statement_timeout` do PostgREST e o front mostra o toast genérico "demorou demais", parecendo que o filtro "não funciona" quando se coloca um intervalo maior.

2. **Relatório de Comissão Bordado com defeito**
   O `historico` está com entradas duplicadas no mesmo segundo (ex.: três linhas "Conferido" 14:34/14:34/14:35, três "Bordado 7Estrivos" 16:28). Isso acontece porque:
   - `updateOrderStatus` (em `AuthContext.tsx`) **não checa** se o pedido já está no `newStatus` — empilha mesmo assim.
   - O checkbox "Conferido" em `OrderDetailPage.tsx` faz o mesmo (sem guarda).
   - A RPC `bordado_baixar_pedido` tem guarda; portanto a sujeira vem do front.
   Como a baixa de bordado pode aparecer duplicada e o relatório roda regra de "regressão posterior" (qualquer entrada de etapa anterior depois da baixa invalida a baixa), entradas espúrias inflam falsos positivos/negativos.

## Solução

### Parte A — Eliminar duplicatas na origem (frontend)

- `src/contexts/AuthContext.tsx` → `updateOrderStatus`: se `currentRow.status === newStatus` e não houver observação nova, sair sem gravar.
- `src/pages/OrderDetailPage.tsx` (checkbox Conferido): só anexar entrada no histórico se `order.status !== 'Conferido'` (a condição já existe — reforçar e não anexar quando status já é Conferido).

### Parte B — Tabela normalizada para "mudanças de status" (performance)

Cria uma tabela leve e indexada que é a "view materializada" do histórico:

```sql
CREATE TABLE public.order_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  changed_on date NOT NULL,
  changed_at timestamptz,
  usuario text,
  UNIQUE (order_id, status, changed_on, changed_at)
);
CREATE INDEX ON public.order_status_changes (status, changed_on);
CREATE INDEX ON public.order_status_changes (order_id);
```

GRANTs apropriados (`select` para `authenticated`, `all` para `service_role`) + RLS espelhando `orders` (admin vê tudo, vendedor vê só do seu pedido, bordado vê dos status de bordado).

**Trigger `AFTER INSERT OR UPDATE OF historico, status ON orders`** que faz upsert em `order_status_changes` a partir das entradas novas do JSONB (calcula `changed_on` a partir de `data` em YYYY-MM-DD ou DD/MM/YYYY como hoje). Conflitos no UNIQUE viram no-op — duplicatas no JSONB não geram linhas duplicadas.

**Backfill em uma migração**: percorre todos os pedidos existentes e popula `order_status_changes` (deduplicado pelo UNIQUE).

### Parte C — Reescrever `find_orders_by_status_change`

Troca o scan de JSONB por:

```sql
SELECT DISTINCT order_id
FROM public.order_status_changes
WHERE status = ANY(_status)
  AND changed_on BETWEEN _de AND _ate;
```

Plano: index-only scan em `(status, changed_on)`. Passa de segundos para milissegundos, e o filtro de duas datas deixa de cair em timeout.

### Parte D — Relatório Bordado fica consistente

Com a Parte A já não há mais duplicata nova; mas o gerador (`generateBordadoBaixaResumoPDF` em `src/lib/pdfGenerators.ts`) também passa a usar `order_status_changes` para listar as baixas no período em vez de reescanear `historico`. A regra de "regressão posterior" continua olhando o histórico do pedido, mas a base de candidatos vem já deduplicada — corrigindo os falsos positivos/negativos atuais.

## Detalhes técnicos

- Migração 1: criar `order_status_changes`, GRANTs, RLS, trigger e backfill.
- Migração 2: substituir `find_orders_by_status_change` para ler da nova tabela.
- Sem mudança no formato existente de `historico` (continua sendo a fonte de verdade exibida no detalhe do pedido). A nova tabela é só índice/consulta.
- Não toco no fluxo da `bordado_baixar_pedido` (já está correta).
- Sem alteração no `useOrders.ts` — ele já chama a mesma RPC.

## Fora do escopo (proponho separado, se quiser)

- "Compactar" o `historico` atual removendo linhas adjacentes idênticas (mesma `data`+`hora`+`local`). Não é necessário para resolver os bugs, mas reduz tamanho da coluna e melhora leitura na tela de detalhe.
