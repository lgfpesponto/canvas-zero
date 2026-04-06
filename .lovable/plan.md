

## Reorganizar layout dos cards nos quadros de solados

### O que muda

Cada card de pedido passa a ter layout em duas colunas lado a lado:

**Lado esquerdo:** Checkbox + Número do pedido, Vendedor, Descrição da sola, Botão Feito

**Lado direito:** Data, Prazo restante, Progresso de produção (alinhados à direita)

### Alteração

**Arquivo:** `src/components/SoladoBoard.tsx` (linhas 254-296)

Substituir o layout atual (tudo empilhado verticalmente) por um `flex` com dois blocos:

- Bloco esquerdo (`flex-1`): checkbox, número+vendedor, descrição da sola com labels, botão Feito
- Bloco direito (`shrink-0`, alinhado à direita): prazo, progresso (badge), data — empilhados verticalmente ou em coluna

Isso separa visualmente as informações do pedido (esquerda) das informações de acompanhamento (direita).

