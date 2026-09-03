# Corrigir preço do Modelo na composição de bota de estoque

## Investigação (dados reais)

Conferi os pedidos de bota de estoque no banco:

- **4-411EST** (03/09) — item cobrado R$ 408,80. A ficha tem `Bola Grande: 48` (48 × R$ 0,60 = **R$ 28,80**). Modelo real = R$ 260. Como a composição não tem linha de Bola Grande, os R$ 28,80 vão parar dentro do Modelo, que aparece como R$ 288,80 — um valor que nunca existiu.
- **3-57EST / 3-56EST / 6-45EST** — sem Bola Grande, a composição fecha certinho (260 + 30 bordado + 20 cor da sola = 310). Ou seja, o erro só aparece em ficha que tem itens não cobertos pela composição.
- **14 pedidos** de bota pronta entrega têm Bola Grande na ficha, e o primeiro é de **14/08/2026** — bate exatamente com "passou a acontecer tem pouco tempo".

### Causa

1. `buildBotaComposicao` (usada só nos pedidos de estoque) **não tem linha de Bola Grande**, enquanto o cálculo oficial (`recomputeSubtotal`) tem. O preço do produto de estoque já inclui a Bola Grande, então sobra diferença.
2. Ao encontrar diferença, a função **soma o resíduo dentro da linha do Modelo** para o subtotal fechar — é isso que gera o "preço de modelo que nunca existiu".
3. Agrava: no detalhe do pedido a composição é montada **sem a tabela de opções customizadas** (parâmetro passado como `undefined`), então bordados/lasers cadastrados só em opções customizadas valem R$ 0 e aumentam o resíduo.

## O que fazer

1. **Incluir Bola Grande na composição** da bota de estoque (`Bola Grande x48 — R$ 28,80`), igual às demais quantidades de metais (Strass, Cruz, Bridão, Cavalo).
2. **Nunca alterar o preço do Modelo**: remover a normalização que embute o resíduo na linha do Modelo.
3. Quando ainda sobrar diferença, mostrá-la como **linha própria** antes do subtotal: `Acréscimo / arredondamento` (positiva) ou `Desconto aplicado` (negativa). O subtotal continua fechando com o valor cobrado, mas cada preço de ficha fica correto.
4. **Passar a tabela de opções customizadas** para a composição no detalhe, para bordados/lasers deixarem de valer R$ 0.
5. Nada muda no valor cobrado nem no banco — apenas a exibição da composição fica correta (inclusive nos 14 pedidos já existentes, que são recalculados na tela).

## Detalhes técnicos

- `src/lib/estoqueOrderComposition.ts`
  - Adicionar, junto aos metais, `getBolaGrandeQtd`-equivalente lendo `ficha_snapshot.extra_detalhes.bolaGrandeQtd` e `tipo_metal` (`Bola Grande:48`), multiplicado por `getDynamicUnitPrice('bola_grande', BOLA_GRANDE_PRECO)`.
  - Trocar o bloco final de normalização: em vez de somar o resíduo em `Modelo: ...`, empurrar uma linha `Acréscimo / arredondamento` ou `Desconto aplicado` quando `Math.abs(residuo) >= 0.01`.
- `src/pages/OrderDetailPage.tsx` (~linha 1073)
  - `buildBotaComposicao(b, findFichaPrice, getByCategoria, valorManual)` — passar `getByCategoria` (já disponível via `useCustomOptions`).
- Sem migração de banco e sem alteração de preço gravado.
