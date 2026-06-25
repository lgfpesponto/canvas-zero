# Excluir produto do estoque + bloquear recriação duplicada

## Diagnóstico
- A RPC `criar_estoque_produto` já marca `orders.estoque_baixado = true` e grava `estoque_produto_id`. Quando o pedido entra de novo na rotina de criar estoque, a função aborta com `'Pedido já teve estoque criado'`. Ou seja, **a regra de "não recriar com os mesmos pedidos" já existe** — só precisa ser **desfeita** quando o admin excluir o produto.
- Hoje não existe botão de excluir produto na página `/estoque` (foi removido junto com a edição manual na Fase 6). Vamos trazer só a exclusão de volta, restrita a admin.

## Mudanças

### 1. Migration — nova RPC `excluir_estoque_produto`
```sql
CREATE OR REPLACE FUNCTION public.excluir_estoque_produto(_produto_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod record;
  v_pedidos_liberados int := 0;
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem excluir produtos do estoque';
  END IF;

  SELECT * INTO v_prod FROM public.estoque_produtos WHERE id = _produto_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;

  -- Libera os pedidos que originaram esse produto para poderem criar estoque de novo
  UPDATE public.orders
     SET estoque_baixado = false,
         estoque_produto_id = NULL,
         historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
           'local', status,
           'descricao', format('Produto de estoque excluído (%s tam %s) — pedido liberado para recriar estoque', v_prod.nome, v_prod.tamanho),
           'usuario', COALESCE(public.current_user_nome_completo(),'Admin')
         ))
   WHERE estoque_produto_id = _produto_id;
  GET DIAGNOSTICS v_pedidos_liberados = ROW_COUNT;

  DELETE FROM public.estoque_produtos WHERE id = _produto_id;

  RETURN jsonb_build_object(
    'ok', true,
    'produto_id', _produto_id,
    'pedidos_liberados', v_pedidos_liberados
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.excluir_estoque_produto(uuid) TO authenticated;
```
- Hard delete (apaga linha de `estoque_produtos`). A grade do produto raiz é composta por várias linhas (uma por tamanho) — a exclusão é por **tamanho** (linha individual), igual ao botão "Excluir" original que cada card de tamanho tinha. Se admin quiser zerar o produto inteiro, exclui cada tamanho.
- Reseta `estoque_baixado` e `estoque_produto_id` nos pedidos que apontavam para esse produto e registra no histórico — assim a checagem existente em `criar_estoque_produto` (`IF ped.estoque_baixado THEN RAISE`) já permite recriar.
- Sem checagem extra de "tem quantidade ainda em estoque" — é decisão do admin (alinhado com a permissão de exclusão).

### 2. `src/pages/EstoquePage.tsx`
- Voltar a importar `useAuth` e o ícone `Trash2`.
- Em cada chip de tamanho dentro do card (onde aparece "35 · 1 un · sku..."), adicionar um botão pequeno `Trash2` visível **apenas para admin** (`isAdminMaster || isAdminProducao`).
- Ao clicar: abrir `confirm()` simples ("Excluir tamanho X do produto Y? Os pedidos originais poderão ser usados para criar estoque novamente."), chamar `supabase.rpc('excluir_estoque_produto', { _produto_id: t.id })`, mostrar toast com `pedidos_liberados` e dar refetch (o realtime também atualiza).
- **Nenhum botão de editar grade** — só excluir, como o usuário pediu.

### 3. Sem mudança na regra de criar estoque
- `criar_estoque_produto` já bloqueia recriação via `estoque_baixado`. Não precisa tocar.
- Reaplicar via `criarEstoqueEmMassa` (Reports/CompletarSkus) continua respeitando o mesmo bloqueio.

## Fora de escopo
- Não mexer no fluxo de venda (`comprar_estoque`) nem nos triggers de devolução por cancelamento.
- Não restaurar o botão "Editar grade" — exclusão é a única ação admin direta.
