

## Reorganizar layout dos cards nos quadros de solados

### O que muda

Remover a coluna direita separada. Cada card passa a ter layout vertical com subquadros separados por linhas:

1. **Linha 1:** Checkbox + Número do pedido + Vendedor + Botão Feito (à direita)
2. **Separador horizontal**
3. **Linha 2:** Descrição da sola (2 linhas com labels)
4. **Separador horizontal**
5. **Linha 3:** Prazo e Status lado a lado, separados por uma linha vertical

Remover a informação de Data. Manter `divide-y` entre pedidos.

### Layout visual

```text
┌─────────────────────────────────────────────────────┐
│ ☐  1234 — Vendedor                         [Feito] │
├─────────────────────────────────────────────────────┤
│ Tamanho: 37 · Gênero: Fem · Tipo: Borracha · Fmt   │
│ Cor: Preto · Vira: Rosa · Forma: 2300               │
├─────────────────────────────────────────────────────┤
│ Prazo: 15d          │  Status: Corte                │
└─────────────────────────────────────────────────────┘
```

### Alteração em `src/components/SoladoBoard.tsx` (linhas 268-328)

Substituir o layout de duas colunas (flex justify-between) por layout vertical:
- Topo: flex com checkbox, número+vendedor à esquerda, botão Feito à direita
- Meio (após `border-t`): descrição da sola em 2 linhas
- Base (após `border-t`): flex com Prazo à esquerda e Status à direita, separados por `border-r`
- Remover bloco de Data e a coluna direita inteira

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Layout vertical com subquadros, remover data, prazo+status embaixo da sola |

