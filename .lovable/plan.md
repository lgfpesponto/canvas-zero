# Corrigir preço do Modelo na composição de bota de estoque

## O problema

Na composição de um pedido de bota comprada do estoque, a linha do **Modelo** aparece com um valor que "nunca existiu" (ex.: R$ 412,37 em vez do valor padrão do modelo).

Causa confirmada no código:

1. A composição de cada bota é montada em `buildBotaComposicao` recebendo o **valor congelado** do item (o preço realmente cobrado na compra).
2. Quando a soma das linhas da ficha não fecha exatamente com esse valor, a função joga **toda a diferença dentro da linha do Modelo** (bloco final "Preço congelado: normaliza a composição..."), distorcendo o preço padrão do modelo.
3. A diferença hoje é grande porque, no detalhe do pedido, a composição da bota é montada **sem a tabela de opções customizadas** (o parâmetro de busca por categoria é passado como `undefined`). Bordados, recortes e afins acabam valendo R$ 0 na soma, gerando um resíduo enorme que vai todo para o Modelo. Some-se a isso descontos/acréscimos aplicados na venda de estoque, que também não são linha própria.

## O que fazer

1. **Nunca alterar o preço do Modelo.** Remover a normalização que embute o resíduo na linha do Modelo.
2. **Mostrar a diferença como linha própria**, logo antes do subtotal do item:
   - resíduo positivo: `Acréscimo / arredondamento`
   - resíduo negativo: `Desconto aplicado`
   Assim o subtotal continua fechando exatamente com o valor cobrado, mas cada preço de ficha permanece o real.
3. **Passar a tabela de opções customizadas** para a composição no detalhe do pedido, para que bordados/recortes/lasers deixem de valer R$ 0 e o resíduo fique pequeno ou zero.
4. Manter o total do item e o total do pedido exatamente como estão hoje (nada muda no valor cobrado, só na exibição da composição).

## Detalhes técnicos

- `src/lib/estoqueOrderComposition.ts`
  - Trocar o bloco de normalização final: em vez de somar o resíduo em `Modelo: ...`, adicionar `{ label: 'Acréscimo / arredondamento' | 'Desconto aplicado', valor: residuo }` ao fim de `linhas` (usar apenas quando `Math.abs(residuo) >= 0.01`).
  - Retornar também o resíduo no objeto de retorno para quem quiser tratá-lo à parte.
- `src/pages/OrderDetailPage.tsx` (linha ~1073)
  - `buildBotaComposicao(b, findFichaPrice, getByCategoria, valorManual)` — passar `getByCategoria` (já disponível via `useCustomOptions`) no lugar de `undefined`.
- Sem mudanças de banco, de preço gravado ou de regra de cobrança.
