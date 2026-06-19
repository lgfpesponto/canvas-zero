create or replace function public.get_public_tracking(_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb;
begin
  select to_jsonb(o.*)
         - 'preco' - 'preco_congelado' - 'preco_regra_versao' - 'preco_migrado_v2'
         - 'cliente'
         - 'desconto' - 'desconto_justificativa'
         - 'adicional_valor'
         - 'conferido' - 'conferido_por' - 'conferido_em'
         - 'impressoes' - 'alteracoes'
         - 'user_id'
    into r
    from public.orders o
   where o.id = _id;
  return r;
end $$;

revoke all on function public.get_public_tracking(uuid) from public;
grant execute on function public.get_public_tracking(uuid) to anon, authenticated;