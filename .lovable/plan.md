

## Plano: Corrigir composição de preço na página de detalhes do pedido

### Problema

A **OrderDetailPage** (página de detalhes do pedido) usa apenas o array hardcoded `BORDADOS` para calcular a composição de preço (linha 140-144). Bordados adicionados via admin (como "Estrelas (Americana)") existem na tabela `custom_options` mas não no array hardcoded, então seus preços não aparecem na composição.

O OrderPage (criação) já foi corrigido para buscar preços de `ficha_variacoes` → `custom_options` → fallback hardcoded. Mas a página de detalhes ficou desatualizada.

### Solução

**Arquivo**: `src/pages/OrderDetailPage.tsx`

1. Importar e usar o hook `useFichaVariacoesLookup` e `useCustomOptions`
2. Substituir a busca de preço de bordados (linhas 140-144) para usar a mesma lógica de cascata: `ficha_variacoes` → `custom_options` → arrays hardcoded por região (BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA)
3. Diferenciar preços por região (cano/gáspea/taloneira) em vez de usar o array genérico `BORDADOS`

Mudança principal nas linhas 140-144:
```ts
// Antes:
[order.bordadoCano, order.bordadoGaspea, order.bordadoTaloneira].forEach(bStr => {
  if (bStr) bStr.split(', ').forEach(b => {
    const p = BORDADOS.find(x => x.label === b)?.preco;
    if (p) priceItems.push([b, p]);
  });
});

// Depois:
const findDetailPrice = (b: string, cat: string, fallback: typeof BORDADOS) =>
  findFichaPrice(b, cat) ?? getByCategoria(cat).find(x => x.label === b)?.preco ?? fallback.find(x => x.label === b)?.preco ?? 0;

const bordadoPairs: [string, string, typeof BORDADOS][] = [
  [order.bordadoCano, 'bordado_cano', BORDADOS_CANO],
  [order.bordadoGaspea, 'bordado_gaspea', BORDADOS_GASPEA],
  [order.bordadoTaloneira, 'bordado_taloneira', BORDADOS_TALONEIRA],
];
bordadoPairs.forEach(([bStr, cat, fallback]) => {
  if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
    const p = findDetailPrice(b, cat, fallback);
    if (p) priceItems.push([b, p]);
  });
});
```

4. Aplicar a mesma lógica para laser (já usa constantes hardcoded, mas pode haver lasers customizados no futuro)

### Arquivos afetados
- `src/pages/OrderDetailPage.tsx` -- importar hooks e atualizar lógica de composição de preço

### Impacto
- Pedidos existentes como o 1914 passarão a exibir "Estrelas (Americana) R$25" na composição
- O valor total calculado na composição ficará consistente com o valor salvo no pedido
- Não é necessária migration SQL pois o preço total do pedido já foi salvo corretamente no OrderPage (que já tinha a correção)

