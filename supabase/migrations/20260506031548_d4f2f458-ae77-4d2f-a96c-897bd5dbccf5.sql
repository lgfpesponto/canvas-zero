
CREATE OR REPLACE VIEW public.vw_auditoria_alteracoes AS
-- 1) Alterações em campos do pedido
SELECT
  ('alt_' || o.id::text || '_' || idx)::text AS id,
  'alteracao_pedido'::text AS tipo,
  COALESCE((alt->>'data')::date, o.created_at::date) AS data,
  COALESCE(alt->>'hora', to_char(o.created_at,'HH24:MI')) AS hora,
  ((COALESCE(alt->>'data', to_char(o.created_at,'YYYY-MM-DD')) || ' ' ||
    COALESCE(alt->>'hora','00:00'))::timestamp) AS ts,
  COALESCE(alt->>'usuario','—') AS usuario,
  o.id AS order_id,
  o.numero AS numero,
  o.vendedor AS vendedor,
  o.cliente AS cliente,
  o.status AS status_atual,
  COALESCE(alt->>'descricao','') AS descricao,
  COALESCE(alt->>'justificativa','') AS justificativa,
  COALESCE((alt->>'afetouValor')::boolean, false) AS afetou_valor,
  alt AS detalhes
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.alteracoes,'[]'::jsonb)) WITH ORDINALITY t(alt, idx)

UNION ALL

-- 2) Mudanças de status (histórico)
SELECT
  ('hist_' || o.id::text || '_' || idx)::text AS id,
  'mudanca_status'::text AS tipo,
  COALESCE((h->>'data')::date, o.created_at::date) AS data,
  COALESCE(h->>'hora', to_char(o.created_at,'HH24:MI')) AS hora,
  ((COALESCE(h->>'data', to_char(o.created_at,'YYYY-MM-DD')) || ' ' ||
    COALESCE(h->>'hora','00:00'))::timestamp) AS ts,
  COALESCE(h->>'usuario','—') AS usuario,
  o.id AS order_id,
  o.numero AS numero,
  o.vendedor AS vendedor,
  o.cliente AS cliente,
  o.status AS status_atual,
  COALESCE(h->>'descricao','Movido para ' || COALESCE(h->>'local','')) AS descricao,
  COALESCE(h->>'justificativa','') AS justificativa,
  false AS afetou_valor,
  h AS detalhes
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.historico,'[]'::jsonb)) WITH ORDINALITY t(h, idx)

UNION ALL

-- 3) Movimentos de saldo de revendedor
SELECT
  ('sal_' || m.id::text) AS id,
  ('saldo_' || m.tipo)::text AS tipo,
  m.created_at::date AS data,
  to_char(m.created_at,'HH24:MI') AS hora,
  m.created_at::timestamp AS ts,
  COALESCE((SELECT p.nome_completo FROM public.profiles p WHERE p.id = m.created_by),'Sistema') AS usuario,
  m.order_id,
  (SELECT numero FROM public.orders WHERE id = m.order_id) AS numero,
  m.vendedor AS vendedor,
  NULL::text AS cliente,
  NULL::text AS status_atual,
  COALESCE(m.descricao,'') AS descricao,
  ''::text AS justificativa,
  true AS afetou_valor,
  jsonb_build_object('valor', m.valor, 'saldo_anterior', m.saldo_anterior, 'saldo_posterior', m.saldo_posterior) AS detalhes
FROM public.revendedor_saldo_movimentos m

UNION ALL

-- 4) Pedidos excluídos
SELECT
  ('del_' || d.id::text) AS id,
  'pedido_excluido'::text AS tipo,
  d.deleted_at::date AS data,
  to_char(d.deleted_at,'HH24:MI') AS hora,
  d.deleted_at::timestamp AS ts,
  COALESCE((SELECT p.nome_completo FROM public.profiles p WHERE p.id = d.deleted_by),'—') AS usuario,
  d.order_id,
  COALESCE(d.order_data->>'numero','') AS numero,
  COALESCE(d.order_data->>'vendedor','') AS vendedor,
  COALESCE(d.order_data->>'cliente','') AS cliente,
  COALESCE(d.order_data->>'status','') AS status_atual,
  'Pedido excluído'::text AS descricao,
  ''::text AS justificativa,
  true AS afetou_valor,
  d.order_data AS detalhes
FROM public.deleted_orders d

UNION ALL

-- 5) Avisos de sistema
SELECT
  ('ann_' || a.id::text) AS id,
  'aviso_sistema'::text AS tipo,
  a.created_at::date AS data,
  to_char(a.created_at,'HH24:MI') AS hora,
  a.created_at::timestamp AS ts,
  COALESCE((SELECT p.nome_completo FROM public.profiles p WHERE p.id = a.created_by),'—') AS usuario,
  NULL::uuid AS order_id,
  NULL::text AS numero,
  NULL::text AS vendedor,
  NULL::text AS cliente,
  NULL::text AS status_atual,
  COALESCE(a.mensagem,'(aviso sem mensagem)') AS descricao,
  ''::text AS justificativa,
  false AS afetou_valor,
  jsonb_build_object('tipo', a.tipo, 'scheduled_at', a.scheduled_at, 'ativo', a.ativo) AS detalhes
FROM public.system_announcements a;

-- A view herda RLS das tabelas base. Para garantir acesso só a admin_master,
-- criamos uma RPC SECURITY DEFINER que checa o role.
CREATE OR REPLACE FUNCTION public.get_auditoria_alteracoes(
  _de date DEFAULT NULL,
  _ate date DEFAULT NULL,
  _usuario text DEFAULT NULL,
  _vendedor text DEFAULT NULL,
  _numero text DEFAULT NULL,
  _tipos text[] DEFAULT NULL,
  _busca text DEFAULT NULL,
  _limit integer DEFAULT 200,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.vw_auditoria_alteracoes
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode consultar auditoria';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.vw_auditoria_alteracoes v
  WHERE (_de IS NULL OR v.data >= _de)
    AND (_ate IS NULL OR v.data <= _ate)
    AND (_usuario IS NULL OR v.usuario ILIKE '%' || _usuario || '%')
    AND (_vendedor IS NULL OR v.vendedor ILIKE '%' || _vendedor || '%')
    AND (_numero IS NULL OR v.numero ILIKE '%' || _numero || '%')
    AND (_tipos IS NULL OR array_length(_tipos,1) IS NULL OR v.tipo = ANY(_tipos))
    AND (_busca IS NULL OR _busca = '' OR
         v.descricao ILIKE '%' || _busca || '%' OR
         v.justificativa ILIKE '%' || _busca || '%')
  ORDER BY v.ts DESC NULLS LAST, v.id DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auditoria_alteracoes_count(
  _de date DEFAULT NULL,
  _ate date DEFAULT NULL,
  _usuario text DEFAULT NULL,
  _vendedor text DEFAULT NULL,
  _numero text DEFAULT NULL,
  _tipos text[] DEFAULT NULL,
  _busca text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qtd bigint;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode consultar auditoria';
  END IF;

  SELECT count(*) INTO qtd
  FROM public.vw_auditoria_alteracoes v
  WHERE (_de IS NULL OR v.data >= _de)
    AND (_ate IS NULL OR v.data <= _ate)
    AND (_usuario IS NULL OR v.usuario ILIKE '%' || _usuario || '%')
    AND (_vendedor IS NULL OR v.vendedor ILIKE '%' || _vendedor || '%')
    AND (_numero IS NULL OR v.numero ILIKE '%' || _numero || '%')
    AND (_tipos IS NULL OR array_length(_tipos,1) IS NULL OR v.tipo = ANY(_tipos))
    AND (_busca IS NULL OR _busca = '' OR
         v.descricao ILIKE '%' || _busca || '%' OR
         v.justificativa ILIKE '%' || _busca || '%');
  RETURN qtd;
END;
$$;
