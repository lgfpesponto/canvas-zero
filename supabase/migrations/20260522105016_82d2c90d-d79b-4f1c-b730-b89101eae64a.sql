
-- 1) Desconto R$5 nos pedidos antigos com Florência no cano
UPDATE public.orders
SET desconto = 5,
    desconto_justificativa = 'Preço da Florência alterado em 19/05/2026 — ajuste de R$5',
    alteracoes = COALESCE(alteracoes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'usuario', 'Sistema',
      'descricao', 'Desconto automático de R$5: preço da Florência alterado em 19/05/2026',
      'justificativa', 'Migração: alinhamento de preço da Florência (R$25 → R$30) — pedidos antigos recebem R$5 de desconto',
      'afetouValor', true
    ))
WHERE bordado_cano = 'Florência'
  AND data_criacao < '2026-05-19'
  AND COALESCE(desconto, 0) = 0
  AND status <> 'Cancelado';

-- 2) Descongelar todos os pedidos não cancelados e invalidar versão de regra
UPDATE public.orders
SET preco_congelado = false,
    preco_regra_versao = NULL
WHERE preco_congelado = true
  AND status <> 'Cancelado';

-- 3) Novo default = false (volta ao comportamento de recalcular pelas regras)
ALTER TABLE public.orders ALTER COLUMN preco_congelado SET DEFAULT false;
