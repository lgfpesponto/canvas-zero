## Reescrever `generateBaixaMontagemPDF` (src/lib/pdfGenerators.ts)

Substituir o layout atual de "meia folha por via" por um layout multi-página real, com paginação automática.

### Estrutura de página

- A4 retrato, margens 15mm (laterais/top/bottom) para garantir impressão sem corte.
- **Cada via em folhas separadas**: 
  1. Imprime todas as páginas da **Via Montagem** (`doc.addPage()` enquanto houver pedidos).
  2. `doc.addPage()` e imprime todas as páginas da **Via 7Estrivos**.
- Remover o divisor tracejado/recorte do meio da folha.

### Cabeçalho (repetido em toda página da via)

- Título: `Relatório de Baixa Montagem — 7ESTRIVOS`
- Linha: `Gerado em: ... • Operador: ... • Via Montagem (pág X/Y)`

### Tabela de itens

Colunas com espaçamento corrigido (modelo recebe mais espaço, data afastada do modelo):

```
#  | Nº pedido | Data baixa | Modelo .................... | Qtd | Valor
15   25          45           70 → 150 (largura ~80mm)     155   180
```

- Linha fina horizontal (`setLineWidth(0.1)`) abaixo do header **e entre cada pedido**.
- Cabeçalho da tabela redesenhado no topo de cada nova página.
- Quando `y` ultrapassa o limite inferior (≈ pageH - 40 reservados p/ totais+assinatura **da última página**), chama `doc.addPage()`, redesenha header da via + header da tabela, e continua — **sem truncar e sem reduzir fonte**.
- `ERRO MONTAGEM`: mostrar apenas `ERRO` (vermelho, bold) na coluna Valor, alinhado à direita, com margem suficiente para não tocar a coluna Qtd (Qtd em 155, Valor em 180 → folga garantida).

### Totais + assinatura (apenas na última página da via)

- Logo após o último pedido, deixar ~6mm de respiro e desenhar linha fina.
- Bloco de totais alinhado à **direita**, formato consistente `N × R$ XX,00 = R$ YYY,YY` em uma única linha (qtd, unitário e subtotal juntos, não separados em lados opostos):
  - `2 × R$ 19,00 = R$ 38,00`
  - `5 × R$ 21,00 = R$ 105,00`
  - `3 × R$ 23,00 = R$ 69,00`
  - (se houver) `1 × outros = R$ XX,XX`
  - (se houver) `1 × ERRO MONTAGEM = não cobrado` (vermelho)
- Linha fina separadora.
- `TOTAL GERAL  R$ XXX,XX` em fonte maior, bold.
- ~6mm depois: linha de assinatura + data.
- Se não couber totais+assinatura na página corrente, faz `addPage()` antes de desenhá-los.

### Numeração

- Manter `stampPageNumbers(doc)` no final.

### Nada mais muda

Sem alterações no portal, hooks, ou cálculos — apenas o gerador de PDF.