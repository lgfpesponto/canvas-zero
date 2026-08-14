# Por que o portal ficou lento — e como corrigir

## O que eu medi

Consultei as consultas mais lentas do banco (pg_stat_statements) e o tamanho da tabela `orders`:

- `orders`: 11.506 pedidos, 61 MB, ~1,9 KB por linha (os campos JSON `extra_detalhes`, `ficha_snapshot`, `historico` são pesados).
- Listagem de pedidos (`select *` com filtros + ordenação): média de 474 ms a 1.046 ms por chamada, picos de 6-7 segundos.
- Uma consulta que lê `vendedor, cliente` de **todos** os pedidos foi executada 20.411 vezes (média 191 ms) — é a lista de filtros/sugestões sendo recarregada a cada abertura de página.
- As políticas de segurança (RLS) de leitura em `orders` chamam `auth.uid()`, `is_any_admin()` e `has_role()` sem estarem "envelopadas", o que faz o Postgres reavaliar essas funções **linha a linha** — em 11 mil linhas isso multiplica o custo de toda listagem, relatório e contagem.

Ou seja: não foi uma única mudança recente que quebrou tudo — é o volume de pedidos crescendo somado a três padrões caros que agora pesam.

## Correções propostas

1. **RLS mais barata (maior ganho, sem mudar comportamento)**
   Reescrever as políticas de SELECT/UPDATE de `orders` usando `(select auth.uid())`, `(select is_any_admin(auth.uid()))` e `(select has_role(...))`, para o Postgres avaliar uma única vez por consulta em vez de por linha. As permissões continuam exatamente iguais.

2. **Parar de baixar a tabela inteira para montar filtros**
   Substituir a leitura de `vendedor, cliente` de todos os pedidos por uma função no banco que devolve apenas os valores distintos (como já existe `get_vendedores_distinct`), com cache no front — deixa de trafegar 11 mil linhas em cada abertura de tela.

3. **Listagem mais leve**
   Nas telas de lista (Meus Pedidos / Relatórios), buscar apenas as colunas exibidas em vez de `select *`, deixando os campos JSON grandes (`ficha_snapshot`, `extra_detalhes`, `historico`, `fotos`, `alteracoes`) para quando o pedido for aberto. Isso reduz drasticamente o tamanho da resposta e o tempo de rede.

4. **Índices complementares**
   Adicionar índice para o filtro padrão da lista (`estoque_pronto` + `data_criacao DESC, hora_criacao DESC`) e para `created_at DESC, id DESC`, que hoje fazem varredura ordenada completa.

5. **Menos requisições repetidas**
   Ajustar o cache do React Query (staleTime) das listas de apoio (perfis, vendedores, campos da ficha, avisos) para não refazer as mesmas consultas a cada troca de página.

## Detalhes técnicos

- Migração SQL: `ALTER POLICY` nas políticas de `orders` (e nas equivalentes em tabelas grandes relacionadas, se apresentarem o mesmo padrão) + `CREATE INDEX idx_orders_pronto_data ON public.orders (estoque_pronto, data_criacao DESC, hora_criacao DESC)` e `CREATE INDEX idx_orders_created_id_desc ON public.orders (created_at DESC, id DESC)`.
- Nova função `get_clientes_distinct()` (SECURITY DEFINER, STABLE) espelhando `get_vendedores_distinct`.
- Front: ajustar `useOrders.ts` e as telas de lista para usar uma projeção de colunas explícita (tipada com `.returns<T>()`), mantendo a busca por detalhe completa na página do pedido.
- Verificação: rodar `EXPLAIN (ANALYZE)` na consulta de listagem antes e depois e comparar o tempo médio em pg_stat_statements.

## O que não muda

Nenhuma regra de negócio, permissão, layout ou campo de ficha é alterado — apenas desempenho.
