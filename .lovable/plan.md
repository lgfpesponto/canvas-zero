## Erro

`null value in column "hora_criacao" of relation "orders" violates not-null constraint`

A RPC `comprar_estoque` faz `INSERT INTO public.orders` sem informar `hora_criacao` (coluna `NOT NULL` sem default).

## Correção

Migration única atualizando a função `public.comprar_estoque(...)`:

- No `INSERT INTO public.orders (...)`, adicionar as colunas obrigatórias que faltam, com os mesmos valores que o app usa em pedidos normais:
  - `hora_criacao` = `to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')`
  - `data_criacao` = `(now() AT TIME ZONE 'America/Sao_Paulo')::date` (se também estiver NOT NULL — incluir por segurança)
- Manter o `user_id = v_uid` já corrigido na migration anterior.
- Nenhuma outra mudança de lógica (extras por unidade, total, botas[] permanecem como estão).

## Fora de escopo

- UI do `EstoqueBuyDialog` não muda.
- Nenhuma mudança em outras RPCs ou tabelas.
