# Quantidade nas gravatas (Country e Pronta Entrega)

## Gravata Country
- Novo campo "Quantidade" (mínimo 1) na tela de pedido do extra, junto de cor da tira / tipo de metal.
- Valor do pedido = preço unitário x quantidade.
- A quantidade fica gravada no pedido e aparece na composição/detalhe do pedido como "Quantidade: N" e "Gravata Country (N x R$ 30,00)".
- Na edição do extra, o mesmo campo aparece e recalcula o valor.

## Gravata Pronta Entrega
- Em vez de escolher só uma variação, o vendedor pode marcar várias variações da lista e informar a quantidade de cada uma, tudo em um único pedido.
- Cada linha mostra o disponível; a quantidade digitada não pode passar do disponível daquela variação (aviso e bloqueio ao salvar).
- Valor do pedido = soma de (quantidade x preço unitário) de todas as variações marcadas.
- Ao salvar, o estoque de cada variação baixa exatamente a quantidade comprada.
- A composição/detalhe do pedido lista cada variação com sua quantidade e o total de gravatas.
- Na edição do extra, as variações e quantidades ficam visíveis (somente leitura, como já é hoje) e o valor considera as quantidades.

## Detalhes técnicos
- `src/pages/ExtrasPage.tsx`:
  - `gravata_country`: campo `quantidade` no formulário; `calcPrice` passa a `(base ?? 30) * qtd`; incluir `quantidade` em `PRODUCT_FIELDS` e no campo `quantidade` do pedido.
  - `gravata_pronta_entrega`: trocar `RadioGroup`/`selectedStockId` por um mapa `{ stockId: qtd }`; validação por linha contra `item.quantidade`; `calcPrice` soma as quantidades; `extraDetalhes` grava `gravatas: [{ corTira, tipoMetal, corBrilho, quantidade }]` mantendo `corTira`/`tipoMetal`/`corBrilho` no topo quando houver só uma variação (compatibilidade com pedidos antigos e relatórios).
  - Baixa de estoque: chamar a baixa por variação com a quantidade correspondente.
- Banco: nova versão de `decrement_stock` aceitando um parâmetro de quantidade (mantendo a assinatura atual para não quebrar chamadas existentes), com trava para não deixar saldo negativo.
- `src/pages/EditExtrasPage.tsx`: campo quantidade para Country; leitura das gravatas múltiplas no resumo; cálculo de preço com quantidade.
- `src/lib/recomputeOrderPrice.ts`: recálculo canônico dos dois extras considerando quantidade.
- `src/pages/OrderDetailPage.tsx`: linhas de composição com quantidade e, na pronta entrega, uma linha por variação.
- `src/lib/extrasConfig.ts`: rótulo para a nova chave `gravatas`.
- Pedidos já existentes não são alterados: sem quantidade gravada, continuam valendo 1 unidade.
