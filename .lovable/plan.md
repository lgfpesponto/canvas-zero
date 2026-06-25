## Causa do erro

A RPC `comprar_estoque` faz `INSERT INTO orders (...)` sem informar `user_id`, e a coluna é `NOT NULL` → Postgres retorna `null value in column "user_id" of relation "orders" violates not-null constraint`. Precisa passar `auth.uid()` no insert.

## Mudanças

### 1. Migration — corrigir `comprar_estoque` e separar itens por unidade

Atualizar a função `public.comprar_estoque(_items, _vendedor, _cliente, _whatsapp, _numero_pedido)`:

- Adicionar `user_id` na lista de colunas do `INSERT INTO public.orders` usando `v_uid` (já existente).
- Aceitar `extras` (array) dentro de cada `_items[i]`; ao montar `v_botas`, mesclar no objeto da bota: `'extras', COALESCE(item->'extras', '[]'::jsonb)`.
- Continuar gerando **1 entrada por unidade** em `botas[]` (loop `1..v_qtd`) — assim 2un do tam 36 = Item 1 (tam 36) + Item 2 (tam 36), cada um com seus próprios extras.
- `v_total_preco` passa a somar `(preco_unit + soma_extras) * 1` por item para refletir extras.

### 2. Redesenhar `src/components/estoque/EstoqueBuyDialog.tsx`

Trocar a UI atual (linhas com select de tamanho + preço editável) por um fluxo em 2 blocos:

**Bloco A — Tamanhos e quantidades (grid)**
- Mostra **todos** os tamanhos do produto em grade (igual ao print "Tamanhos e quantidades"): label "`<tam>` — `<disp>` disp." + input numérico de quantidade.
- Tamanhos sem estoque ficam disabled mostrando "esgotado".
- Ao digitar quantidade > disponível: força para o máximo e mostra toast `"Só tem X do tamanho Y"`.

**Bloco B — Resumo do pedido (gerado automaticamente)**
- Para cada tamanho com qtd > 0, gera N linhas "Item k — `<nome>` Tam `<tam>` · quantidade fixa 1".
- Preço unitário vem do `produto.preco` (ou `tamanho.preco`) e fica **read-only** (texto, não input).
- Cada item tem botão `+ extra` que abre um seletor com os 5 tipos de `BOTA_PE_EXTRA_TYPES` de `@/lib/botaExtraHelpers` (Adicionar Metais, Carimbo a Fogo, Kit Faca, Kit Canivete, Tiras Laterais), reutilizando a mesma UI condicional de campos que `src/pages/ExtrasPage.tsx` já usa para bota pronta entrega (importar `BOTA_PE_EXTRA_TYPES`, `BOTA_PE_EXTRA_LABEL`, `calcEmbeddedExtraPrice`, `calcBootTotal`).
- Cada item mostra **Subtotal = preço da ficha + Σ extras** e tem botão remover extra.
- Rodapé: **Total** = Σ subtotais.

**Submit**
- Monta `_items` agrupado por `produto_id`/tamanho (campo `quantidade` = nº de unidades daquele tam) + um array paralelo `_items[i].extras_por_unidade` para que a RPC distribua os extras nos itens certos.
- Mantém parsing dos erros `ESTOQUE_INSUFICIENTE` / `NUMERO_DUPLICADO`.

Remover do dialog: input editável de preço, botão "+ tamanho" (não faz mais sentido — todos os tamanhos já aparecem), botão lixeira por linha.

### 3. Visualização do pedido (OrderDetailPage / Composição)

A composição já mostra `Bota 1: 1x Texana Amanda (PRONTA ENTREGA) 37 — R$ 365,00` (print 174) porque cada unidade já é uma bota separada com `quantidade: '1'`. Após o fix da RPC isso continua válido para múltiplos itens, com cada extra aparecendo abaixo do item correspondente (a UI atual de `extra_detalhes.botas[].extras` já é renderizada em ExtrasPage/EditExtrasPage). Nenhuma mudança nova de layout — só garantir que o item gerado pela compra do estoque carregue corretamente os extras adicionados no dialog.

## Fora de escopo

- Não muda preço base do produto no estoque.
- Não permite editar preço unitário no dialog (apenas admin master via "Edição de Valor" no detalhe, que já existe).
- Não altera `criar_estoque_produto` nem `excluir_estoque_produto`.