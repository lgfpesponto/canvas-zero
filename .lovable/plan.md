

## PDF dos Quadros de Solados — Descrição com fundo preto e remover badge

### O que muda

1. **Remover o badge** (ex: "SOLA COURO") que aparece antes da descrição — ele é redundante pois o título do relatório já identifica o quadro.

2. **Descrição da sola com fundo preto e texto branco** — a linha de descrição (ex: "Tipo: borracha  Formato: quadrado  Cor: preta  Vira: rosa") passa a ter um retângulo de fundo preto com texto branco, ocupando a largura total.

### Alteração em `src/components/SoladoBoard.tsx`

Na função `drawBlockLayout` (linhas 33-45), substituir o bloco de badge + description por:

- Calcular a largura do texto da descrição
- Desenhar um `roundedRect` preto (`fillColor(0,0,0)`) com a largura total (`pw`)
- Renderizar o texto da descrição em branco centralizado ou alinhado à esquerda com padding

Na função `exportPDF` (~linha 175), remover a propriedade `badge` do `BlockData` ou simplesmente não usá-la.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | `drawBlockLayout`: remover badge, descrição com fundo preto/texto branco full-width |

