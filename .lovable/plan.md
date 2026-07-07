## Diagnóstico

O ERRO da tela é anterior à mudança do dialog — foi salvo sem `desconto`. Por isso a composição mostra Subtotal R$ 409,60 e Total R$ 409,60, sem a linha de desconto.

Além disso, mesmo em ERROs novos, se o `subtotalReal` recomputado no detalhe divergir alguns centavos do `desconto` gravado, a linha ficaria com resto.

## Correção (apresentação — resolve novos e antigos)

Fazer a composição do detalhe tratar ERRO como caso especial de exibição, sem depender do que está gravado em `desconto`:

**`src/pages/OrderDetailPage.tsx`** — no bloco da composição:

1. **Linha de desconto** (hoje: `{ajusteValor !== 0 && ...}`): quando `order.erroDePedidoId`, forçar a exibição de:
   - Rótulo: `Desconto automático (ERRO)`
   - Valor: `− formatCurrency(subtotalReal)` (mesmo bruto que aparece no Subtotal acima).
2. **Total final** (hoje: `formatCurrency(displayTotal)`): quando `order.erroDePedidoId`, forçar `R$ 0,00`.
3. Não gravar nada no banco — é só apresentação. O `preco = 0` gravado no ERRO já garante que listagens, dashboards e PDF de cobrança continuam somando zero.

## Fora do escopo
- Backfill do `desconto` nos ERROs antigos (não é necessário — o preço final já é 0 no banco).
- Mudanças no dialog de criação (já grava o desconto correto para novos ERROs; a apresentação passa a ignorar esse valor gravado em favor do `subtotalReal` recomputado, o que também elimina divergências de centavos).

## Arquivo afetado
- `src/pages/OrderDetailPage.tsx` (apenas duas condicionais no render da composição)