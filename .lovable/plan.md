## Corrigir Relatório Comissão Bordado — erro de parse de data

### Causa raiz
A RPC `find_orders_by_status_change` recebe `_status=['Baixa Bordado 7Estrivos']` e `_de/_ate` (datas) corretamente. O erro **"date/time field value out of range: '20/05/2026 08:52'"** vem do cast `(h->>'data')::date` sobre `orders.historico`: entradas antigas/recentes estão gravadas em **formato BR com hora** (`DD/MM/YYYY HH:MI`), que o Postgres não consegue converter implicitamente para `date`.

Outros relatórios que usam essa mesma RPC funcionam por sorte (status onde nenhum pedido tem histórico em formato BR). O Bordado pega entradas dos scanners do portal Bordado, que gravam no padrão BR.

### Correção
Nova migration ajustando a RPC para aceitar os dois formatos:

```sql
CREATE OR REPLACE FUNCTION public.find_orders_by_status_change(
  _status text[], _de date, _ate date
) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.orders o
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(o.historico, '[]'::jsonb)) h
    WHERE h->>'local' = ANY(_status)
      AND (
        CASE
          WHEN h->>'data' ~ '^\d{4}-\d{2}-\d{2}'
            THEN substring(h->>'data' from 1 for 10)::date
          WHEN h->>'data' ~ '^\d{2}/\d{2}/\d{4}'
            THEN to_date(substring(h->>'data' from 1 for 10), 'DD/MM/YYYY')
          ELSE NULL
        END
      ) BETWEEN _de AND _ate
  );
$$;
```

- `substring(... 1 for 10)` corta a hora antes do cast, evitando erro mesmo em ISO com `T` ou espaço.
- Regex distingue ISO (`yyyy-mm-dd…`) de BR (`dd/mm/yyyy…`).
- `ELSE NULL` ignora entradas malformadas em vez de quebrar o relatório inteiro.

### Sem mudança no frontend
A chamada em `SpecializedReports.tsx` continua igual. Só a função do banco passa a ser tolerante aos dois formatos — corrige Comissão Bordado e blinda também o "Filtro Mudou para Status" usado em outros relatórios.

### Validação
Depois de aplicar a migration, gerar o relatório Comissão Bordado para o período que estava quebrando. Conferir que retorna pedidos sem erro de toast.
