## Objetivo

No Financeiro → Saldo do Vendedor (drawer "Detalhes"), o **Extrato completo** hoje mostra apenas a descrição "Baixa automática de pedido cobrado" sem identificar o pedido. Além disso, quando o saldo do revendedor cobre um pedido em **Cobrado**, o sistema registra a baixa do saldo mas **não** muda o status do pedido para **Pago** — quem faz isso hoje é a Juliana manualmente, e o histórico do pedido fica com `usuario: "Juliana Cristina Ribeiro"`. O usuário quer que essa transição seja automática e que o histórico identifique como **"Baixa automática"** (sem nome de pessoa).

## 1. Extrato exibir o número do pedido

`src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`

- Buscar, junto com `fetchMovimentos`, os `numero` dos `orders` referenciados pelo `order_id` dos movimentos (uma única query `in('id', ids)` na tabela `orders`).
- Montar um `Map<order_id, numero>` e usá-lo na coluna **Descrição** do extrato:
  - Para `tipo === 'baixa_pedido'` com `order_id` válido: exibir `Baixa automática — Pedido #30023` (ou `Estorno — Pedido #...` quando vier do estorno, que também usa `baixa_pedido`).
  - Mantém o texto atual quando não houver `order_id` (ex.: baixa manual de comprovante).
- Tornar o número clicável (link para `/pedido/:id` na mesma aba) para facilitar conferência.

Não é preciso alterar a função `tentar_baixa_automatica` para isso — o `order_id` já é gravado no movimento.

## 2. Baixa automática deve mover o pedido para "Pago"

Migração nova em `supabase/migrations/`:

Atualizar `public.tentar_baixa_automatica(_vendedor, _admin_id)` para que, logo após inserir o movimento `baixa_pedido` e a linha em `revendedor_baixas_pedido`, **também** atualize o pedido:

```sql
UPDATE public.orders
   SET status = 'Pago',
       historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(
         jsonb_build_object(
           'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
           'local', 'Pago',
           'descricao', 'Pedido movido para Pago',
           'usuario', 'Baixa automática'
         )
       )
 WHERE id = ped.id
   AND status = 'Cobrado';
```

Pontos:
- Usa o rótulo **"Baixa automática"** no campo `usuario` do histórico — não persiste o nome da Juliana mesmo que o `auth.uid()` seja dela.
- Só atua quando o pedido ainda está `Cobrado` (proteção contra concorrência / re-execução).
- Mantém o `created_by` do movimento como `_admin_id` apenas para auditoria interna; a UI de extrato não exibe esse campo, então o nome da Juliana não aparece para o revendedor.

Depois da migração, o fluxo passa a ser: comprovante aprovado → entrada de saldo → `tentar_baixa_automatica` → baixa do saldo + pedido vai automaticamente para **Pago** com histórico "Baixa automática".

## 3. Pedidos antigos (opcional, NÃO incluído)

Pedidos como o `30023` que já foram movidos manualmente para Pago pela Juliana ficam como estão (histórico já registrado). A regra nova vale do deploy em diante. Confirme se quer que eu faça também um script para reescrever o `usuario` desses históricos antigos — por padrão **não** vou tocar em registros existentes para preservar a auditoria.

## Arquivos afetados

- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx` (UI do extrato + busca de números)
- `src/lib/revendedorSaldo.ts` (helper para buscar números, se necessário)
- Nova migração SQL atualizando `tentar_baixa_automatica`
- `mem://features/financeiro/saldo-revendedor` (atualizar a memória descrevendo que a baixa automática agora também muda o pedido para Pago com `usuario = "Baixa automática"`)
