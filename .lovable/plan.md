# Composição completa nos pedidos de estoque

## Problema (confirmado no banco)

A composição do pedido de estoque é montada a partir do `ficha_snapshot` que fica gravado no produto de estoque. Consultando o produto "Sara Látego Preto BF Couro — 35", o snapshot só tem 12 campos:

```text
genero, modelo, solado, cor_sola, cor_vira, formato_bico,
tipo_couro_cano/gaspea/taloneira, cor_couro_cano/gaspea/taloneira
```

Ou seja: bordados, laser/glitter, recortes, metais, acessórios, tricê, tiras, franja, corrente, carimbo, estampa, pintura, costura atrás, nome bordado, sob medida, desenvolvimento e adicional **nunca foram copiados** para o produto. O código que monta a composição (`src/lib/estoqueOrderComposition.ts`) já sabe exibir todos esses itens — ele simplesmente não recebe os dados.

A origem é a função de banco `criar_estoque_produto`, que monta o snapshot com apenas esses 12 campos do pedido.

## O que será feito

1. **Corrigir a origem**: `criar_estoque_produto` passa a copiar do pedido todos os campos da ficha que têm valor — bordados (cano/gáspea/taloneira + cores + descrições de bordado variado), laser e glitter, recortes e cores de recorte, metais (área, tipo, cor, strass, cruz, bridão), acessórios, carimbo, estampa, pintura, tricê, tiras, costura atrás, nome/personalização bordada, sob medida, desenvolvimento, adicional (valor e descrição), cor da linha, borrachinha, vivo e o bloco `extra_detalhes` (franja, corrente, cavalo metal, desenvolvimentos novos).

2. **Backfill dos produtos já cadastrados**: para cada `estoque_produtos` cujo snapshot está incompleto, recompor a partir do pedido de origem (`orders.estoque_produto_id`). Produtos sem pedido de origem rastreável ficam como estão (nada é apagado).

3. **Backfill dos pedidos de estoque já criados**: atualizar o `ficha_snapshot` gravado em `extra_detalhes.botas[]` e no nível do pedido, para os pedidos que ainda não estão nas etapas **Conferido, Cobrado ou Pago** (regra já combinada anteriormente).

4. **Conferir a composição**: os itens que passarem a aparecer têm preço resolvido pela ficha atual, então o subtotal do item pode subir se houver componentes cobrados que antes não apareciam. Isso é o comportamento correto (preço sempre segue a ficha atual), e será validado num pedido real após o backfill.

## Detalhes técnicos

- Migração SQL: `CREATE OR REPLACE FUNCTION public.criar_estoque_produto(...)` com o `jsonb_build_object` expandido, usando `jsonb_strip_nulls` para não gravar chaves vazias.
- Migração de backfill em dois `UPDATE` (produtos e pedidos), com filtro por etapa nos pedidos.
- Nenhuma mudança necessária em `src/lib/estoqueOrderComposition.ts` — ele já cobre todos os campos; ajustes pontuais só se algum campo novo (ex.: recortes) não estiver mapeado lá, caso em que serão adicionadas as linhas correspondentes.
