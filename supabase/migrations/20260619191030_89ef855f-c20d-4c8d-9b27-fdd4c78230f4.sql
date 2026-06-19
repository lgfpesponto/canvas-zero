create or replace function public.get_public_tracking(_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb;
begin
  select to_jsonb(o.*) - 'preco' - 'preco_congelado' - 'preco_regra_versao'
         - 'cliente' - 'cliente_id' - 'cliente_telefone' - 'cliente_email'
         - 'comissao' - 'comissao_paga' - 'comissao_valor'
         - 'desconto' - 'ajuste_valor' - 'ajuste_motivo'
         - 'forma_pagamento' - 'pagamento_status'
         - 'conferido' - 'conferido_por' - 'conferido_em'
         - 'impressoes'
         || jsonb_build_object('vendedor_nome', p.nome)
  into r
  from public.orders o
  left join public.profiles p on p.user_id = o.user_id
  where o.id = _id;
  return r;
end $$;

revoke all on function public.get_public_tracking(uuid) from public;
grant execute on function public.get_public_tracking(uuid) to anon, authenticated;