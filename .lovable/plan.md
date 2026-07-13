## Objetivo

1. Mostrar o **olhinho de foto** (mesmo componente já usado no formulário do pedido) ao lado dos nomes de variações que possuem `foto_url`, tanto na **Composição do Pedido** quanto em **Detalhes da Bota / Detalhes do Cinto** — na tela de detalhe do pedido e no **espelho da ficha** de bota, cinto e extras.
2. No diálogo **Expandir** (multi-seleção com fotos), mostrar quantas variações estão selecionadas com a lista de nomes abaixo, e adicionar botão **OK** ao lado do X para confirmar.

## 1. Olhinho nas variações — detalhe do pedido (`OrderDetailPage`)

### Composição do Pedido (`priceItems`)
- Usar `useFichaVariacoesLookup().findFotoByName(nome)` para achar a `foto_url` a partir do nome puro da variação.
- Para cada linha, extrair o nome da variação removendo prefixos conhecidos (`Modelo: `, `Couro: `, `Bordado: `, `Solado: `, `Cor Sola: `, `Cor Vira: `, `Recorte Cano: `, etc.). Itens de bordado do array já vêm com o próprio nome, então usamos o label direto.
- Renderizar `<VariacaoFotoIcon fotoUrl={...} nome={...} size={14} />` logo após o texto do label (na mesma linha, antes do valor R$).
- Só renderiza se `findFotoByName` retornar algo (o componente já retorna `null` sem foto).

### Detalhes da Bota (`fichaCats` via `buildBootFichaCategories`)
- Estender `FichaField` para carregar opcionalmente o **nome da variação** (`variationName?: string`) — separado do texto de exibição (que hoje é `variação + cor` em minúsculas).
- Em `src/lib/orderFichaCategories.ts`, preencher `variationName` quando o campo corresponde a uma única variação:
  - Couros: cano/gáspea/taloneira → `order.couroCano/Gaspea/Taloneira` (nome do couro).
  - Bordados: cano/gáspea/taloneira → nome do bordado (já disponível em `bC`, `bG`, `bT`). Quando o campo é multi-valor separado por vírgula, guardar um array `variationNames?: string[]` e renderizar um olhinho por variação (com tooltip do próprio nome).
  - Laser/Recortes: idem por parte.
  - Solado: tipo puro (sem formato do bico) → `order.solado`.
  - Cor Sola/Cor Vira/Cor Linha/Cor Borrachinha/Cor Vivo: nome puro.
  - Metais, extras, cliente e observações: sem olhinho (não são variações).
- Na renderização (`OrderDetailPage.tsx` no bloco `fichaCats.map`) chamar `findFotoByName` para cada nome e, se houver, mostrar `<VariacaoFotoIcon />` ao lado do valor. Multi-nomes: um olhinho por variação, um do lado do outro.

### Detalhes de Extra (cinto e outros)
- O ramo `order.tipoExtra && order.extraDetalhes` renderiza campos via `extra products schema`. Aplicar a mesma ideia: onde o valor exibido corresponde a uma variação (por exemplo cores de couro/linha/vivo/bordado do cinto), usar `findFotoByName(valorPuro)` e mostrar o olhinho. Feito localmente no componente que já renderiza os campos do extra (`ExtraProdutoEditPopover` mostra edição; a **exibição** no detalhe é dentro do bloco `order.tipoExtra && order.extraDetalhes` no `OrderDetailPage`; ajustar essa renderização).

## 2. Olhinho nas variações — espelho da ficha

### Bota (`OrderPage.tsx`)
- `mirrorPriceItems`: converter para `Array<{ label: string; valor: number; variationName?: string }>` e renderizar `<VariacaoFotoIcon />` ao lado do label. Mesma regra de extração de nome usada em Composição do Pedido.
- `mirrorGrouped` (Detalhes da Bota do espelho): já é a mesma estrutura conceitual do `fichaCats`; enriquecer com `variationName?/variationNames?` seguindo o mesmo mapeamento e renderizar o olhinho.

### Cinto (`BeltOrderPage.tsx`) e Extras
- `mirrorGrouped` do cinto e o mirror do fluxo de extras: aplicar o mesmo enriquecimento e renderização.

## 3. Diálogo Expandir (`VariacaoExpandirDialog.tsx`)

- **Contador + lista de selecionadas**: abaixo da busca (acima dos cards), mostrar:
  - `"X selecionada(s)"` (chip primary).
  - Lista horizontal (chips pequenos) com os nomes das variações atualmente marcadas — clique no `×` do chip desmarca.
  - Se `selected.length === 0`, esconde a seção.
- **Botão OK**: adicionar botão **OK** no header, ao lado do X de fechar (o X é do `DialogContent` do shadcn). Como o `DialogContent` já injeta o `X`, adicionar o botão dentro do `DialogHeader` (alinhado à direita) com estilo primary; ambos apenas fecham o dialog (a seleção já é aplicada em tempo real via `onToggle`). Texto: `OK` — mesmo comportamento de `onOpenChange(false)`.

## Arquivos afetados

- `src/lib/orderFichaCategories.ts` — adicionar `variationName?`/`variationNames?` em `FichaField` e preencher nos campos aplicáveis.
- `src/pages/OrderDetailPage.tsx` — usar `useFichaVariacoesLookup`, renderizar `VariacaoFotoIcon` em `priceItems`, `fichaCats` e no bloco de detalhes de extra.
- `src/pages/OrderPage.tsx` — trocar `mirrorPriceItems`/`mirrorGrouped` para carregar nome puro e renderizar olhinho.
- `src/pages/BeltOrderPage.tsx` — mesmo tratamento no espelho do cinto.
- `src/components/ficha/VariacaoExpandirDialog.tsx` — contador + chips de selecionadas + botão OK ao lado do X.

## Fora de escopo

- PDFs impressos (mantidos como estão — sem olhinho, sem HTML interativo).
- Alterar a lógica de preço ou o schema do banco.
