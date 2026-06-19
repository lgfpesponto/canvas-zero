# Fix do rastreio público + botões na lista

## Sobre o erro
A página **abriu certinho** (não é problema de publicar). O `column p.user_id does not exist` veio da RPC `get_public_tracking`: fiz `join profiles p on p.user_id = o.user_id`, mas a tabela `profiles` usa `id`, não `user_id`. E nem precisa do join — `orders.vendedor` já tem o nome digitado.

## Sobre o ícone do Lovable
Aquela é a aba **"Adorável"** (favicon padrão Lovable, exibido em qualquer ambiente — preview, `*.lovable.app` e até no domínio próprio se quisermos manter). Continua igual depois de publicar. Fora do escopo agora; se quiser trocar o favicon/título do navegador, faço numa próxima.

## Mudanças

### 1. Corrigir a RPC `get_public_tracking`
Migration que recria a função sem o join com `profiles` (usa direto `o.vendedor`):

```sql
create or replace function public.get_public_tracking(_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public as $$
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
  into r from public.orders o where o.id = _id;
  return r;
end $$;

revoke all on function public.get_public_tracking(uuid) from public;
grant execute on function public.get_public_tracking(uuid) to anon, authenticated;
```

### 2. Botões Copiar/Abrir no `OrderCard`
Em `src/components/OrderCard.tsx`, logo depois do `<span>{deadline.label}</span>` (linha 85), adicionar dois botões pequenos:
- **Copiar** → copia `${window.location.origin}/rastreio/${order.id}` (toast "Link copiado").
- **Abrir** → abre o link em nova aba (`window.open(..., '_blank', 'noopener')`).

Estilo discreto pra não pesar visualmente: `text-[10px] px-2 py-0.5 rounded border`. `stopPropagation` no clique pra não abrir o detalhe.

### Fora de escopo
- Trocar favicon/título da aba do navegador.
- Mudanças no portal logado (já estão prontas).
