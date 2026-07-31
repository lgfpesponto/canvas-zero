# Por que os dois números da Rancho Chique divergem (258 x 249)

## Diagnóstico (confirmado no banco)

Julho/2026, vendedor "Rancho Chique", sem cancelados e sem prefixos TROCA/REFAZENDO/ERRO/INFLUENCER:

- Gráfico "Quantidade de vendas" (filtro "Todos produtos"): **258**
- Painel "Comissão Mensal": **249**
- Diferença: **9 pedidos de produtos extras**

Motivo: os dois blocos usam regras de produto diferentes.

- O gráfico (`get_sales_chart`, opção "Todos produtos") conta **todos** os tipos de pedido, inclusive extras.
- A comissão conta apenas Bota (ficha normal), Bota Pronta Entrega e Regata — extras não geram comissão.

Distribuição do mês (bruta): bota 198, bota pronta entrega 57, regata 1, e extras: gravata country 3, bainha cartão 3, cinto 2, bainha celular 1, chaveiro carimbo 1.

Ou seja, **não há erro de cálculo** — são escopos diferentes. Selecionando "Bota" ou "Bota P.E." no gráfico os números passam a bater com o respectivo recorte.

## Opções de ajuste (escolher uma)

1. Não mexer — apenas documentar (comportamento correto hoje).
2. Adicionar no gráfico uma opção de filtro "Produtos que geram comissão" (bota + bota P.E. + regata), para o vendedor comparar direto com o painel de comissão.
3. Para o perfil `vendedor_comissao`, fixar o gráfico já nesse escopo de comissão, para nunca divergir do painel.

## Detalhes técnicos (se a opção 2 ou 3 for escolhida)

- `get_sales_chart` ganharia um valor de `product_filter` novo (ex.: `comissao`) que filtra `tipo_extra IS NULL OR tipo_extra IN ('bota_pronta_entrega','regata')`, mantendo as exclusões atuais.
- `src/components/dashboard/VendedorDashboard.tsx`: incluir o item no `Select` do gráfico (opção 2) ou usá-lo como padrão quando `role === 'vendedor_comissao'` (opção 3).
- Nenhuma mudança no `CommissionPanel`, que já está correto.
