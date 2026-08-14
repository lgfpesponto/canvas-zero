DELETE FROM public.ficha_variacoes v
USING (
  SELECT campo_id, lower(btrim(nome)) AS n, coalesce(relacionamento::text,'') AS rel, min(id::text) AS keep_id
  FROM public.ficha_variacoes
  WHERE campo_id IS NOT NULL
  GROUP BY campo_id, lower(btrim(nome)), coalesce(relacionamento::text,'')
  HAVING count(*) > 1
) d
WHERE v.campo_id = d.campo_id
  AND lower(btrim(v.nome)) = d.n
  AND coalesce(v.relacionamento::text,'') = d.rel
  AND v.id::text <> d.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS ficha_variacoes_campo_nome_uniq
  ON public.ficha_variacoes (campo_id, lower(btrim(nome)), coalesce(relacionamento::text,''))
  WHERE ativo AND campo_id IS NOT NULL;