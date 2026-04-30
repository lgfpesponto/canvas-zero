## Diagnóstico

Achei o motivo. O problema está em **`src/components/SpecializedReports.tsx`**, função `generateCobrancaPDF` (linhas 1192–1446).

### Como o preço aparece em cada lugar

**Tela de detalhes do pedido / listagens / dashboard:**
Usam `o.preco * o.quantidade` direto do banco. Por isso, depois que você editou o pedido 60636, o valor "novo" aparece corretamente em todo lugar.

**Relatório de Cobrança (PDF):**
Para botas (não-extras), ele **ignora `o.preco`** e recalcula o total somando os preços de cada peça (modelo, bordados, couros, solado, etc.) a partir do banco de preços (`priceWithFallback`) com fallback nas constantes hardcoded:

```ts
// linha 1381–1383
const orderTotal = isBotaPE_cob
  ? priceItems.reduce((s, [, v]) => s + v, 0)
  : (o.tipoExtra ? o.preco : priceItems.reduce((s, [, v]) => s + v, 0));
//                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                bota: SOMA DAS PEÇAS, ignora o.preco
```

### Por que dá divergência

Qualquer uma destas situações causa o "valor antigo" no PDF:

1. **Você mudou o preço de um componente no admin** (ex: aumentou o preço do modelo no `ficha_variacoes`). O pedido salvo continua com o `preco` antigo (que é o que aparece em todo lugar), mas o relatório recalcula com o preço novo — ou vice-versa.
2. **Desconto/adicional aplicado**: o relatório não considera `o.desconto` nem o `adicionalValor` corretamente em todos os caminhos.
3. **Edição que mexeu em peças**: se a soma das peças no momento de gerar o PDF não bate com o `preco` salvo (porque o cache de preços do banco ou o fallback hardcoded está diferente do que estava quando o pedido foi criado/editado), aparece valor diferente.
4. **Bordado Variado / itens com nome customizado** que não casam com nenhuma chave do `priceWithFallback` viram R$ 0 no PDF, mas estão somados em `o.preco`.

A intenção original do relatório era "mostrar o breakdown bonitinho com cada peça e seu preço". O bug é que ele usa essa soma como **TOTAL** da linha e do rodapé, em vez de usar o preço real do pedido.

## Correção proposta

Em **`src/components/SpecializedReports.tsx`**, alterar `generateCobrancaPDF`:

**1. Total da linha e do rodapé devem vir de `o.preco` (com `quantidade` quando aplicável):**

```ts
// Substituir o bloco atual:
const isBotaPE_cob = o.tipoExtra === 'bota_pronta_entrega';
const orderTotal = isBotaPE_cob
  ? (o.preco) // já é o total para bota PE
  : (o.preco * (o.quantidade || 1)); // bota normal e demais extras
```

Regra (igual à usada em `OrderCard.tsx`):
- **Bota normal** (sem `tipoExtra`): `preco * quantidade`
- **Bota Pronta Entrega**: `preco` (já é total)
- **Revitalizador / kit_revitalizador**: `preco * quantidade`
- **Demais extras**: `preco`

**2. Se houver desconto, abater do total da linha** (e exibir como item no breakdown):
```ts
if (o.desconto && o.desconto > 0) {
  priceItems.push([`Desconto${o.descontoJustificativa ? ` (${o.descontoJustificativa})` : ''}`, -o.desconto]);
  orderTotal -= o.desconto;
}
```

**3. O breakdown (`priceItems`) continua sendo exibido na coluna "Composição"** apenas como detalhamento informativo — mas o número grande à direita e o `TOTAL` no rodapé passam a refletir exatamente o que está salvo no pedido (e o que aparece na tela de detalhes).

## Arquivos editados

- `src/components/SpecializedReports.tsx` — ajuste em `generateCobrancaPDF` para o cálculo de `orderTotal` e tratamento de desconto.

## Resultado esperado

Depois do fix, o pedido 60636 (e qualquer outro que tenha sido editado) vai mostrar no PDF de Cobrança **exatamente o mesmo valor** que aparece na tela de detalhes do pedido e nas listagens.
