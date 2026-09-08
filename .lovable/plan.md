# Novo couro: Malhado Pintado

Adicionar "Malhado Pintado" como um novo **tipo de couro**, disponível em todos os produtos de couro (bota, cinto, chaveiro, bainha de cartão e bainha de celular), com acréscimo de **R$ 15,00**.

## O que muda

1. **Lista de tipos de couro**
   - "Malhado Pintado" passa a aparecer na escolha de tipo de couro em: ficha da bota (cano, gáspea, taloneira), cinto, chaveiro com carimbo, bainha de cartão e bainha de celular.

2. **Preço**
   - Sempre que "Malhado Pintado" for escolhido, soma R$ 15,00 ao valor da peça.
   - Na bota o acréscimo segue o mesmo padrão dos couros que já têm adicional (ex.: Vaca Holandesa R$ 15).
   - Nos extras de couro (bainha de celular R$ 50, bainha de cartão R$ 15, chaveiro R$ 50), o valor passa a ter +R$ 15 quando esse couro for escolhido — na criação, na edição, no detalhe do pedido e no recálculo.

3. **Cores**
   - Ficam disponíveis as cores gerais de couro (nenhuma lista fechada específica). Se quiser limitar a cores específicas, é só avisar depois.

4. **Pedidos já existentes**
   - Nenhum pedido antigo tem valor alterado.

## Detalhes técnicos

- `src/lib/orderFieldsConfig.ts`: incluir `'Malhado Pintado'` em `TIPOS_COURO` e `'Malhado Pintado': 15` em `COURO_PRECOS`.
- Banco (dados, via run_sql): inserir a variação `Malhado Pintado` com `preco_adicional = 15` nos campos `couro_cano`, `couro_gaspea`, `couro_taloneira` e `tipo_couro` (cinto), já que a ficha lê as opções de `ficha_variacoes`.
- Extras com couro — adicionar +15 quando `tipoCouro === 'Malhado Pintado'` nos cálculos de:
  - `src/pages/ExtrasPage.tsx` (`chaveiro_carimbo`, `bainha_cartao`, `bainha_celular`)
  - `src/pages/EditExtrasPage.tsx` (mesmos casos)
  - `src/lib/recomputeOrderPrice.ts`
  - `src/pages/OrderDetailPage.tsx` (total e linha da composição, exibindo o acréscimo como item próprio)
- Centralizar o acréscimo em um helper único (ex.: `couroExtraAdicional(tipoCouro)`) para os quatro pontos usarem a mesma regra.
