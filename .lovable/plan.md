

## Mudar layout dos blocos para estilo tabela/grade

### O que muda

Substituir as caixas pretas com texto branco por uma **tabela com bordas (grade)** para cada agrupamento. O layout ficará assim:

```text
┌──────────────────────────────────────────────────┐
│ SOLA: Borracha bico quadrado cor marrom vira rosa│
├────────┬────┬────┬────┬────┬────────────────────-┤
│TAMANHO │ 34 │ 35 │ 38 │ 40 │                     │
├────────┼────┼────┼────┼────┼─────────────────────┤
│QUANTID.│  3 │  2 │  1 │  4 │                     │
└────────┴────┴────┴────┴────┴─────────────────────┘
```

- Linha do título ocupa a largura total da área de conteúdo (com margens)
- Fundo escuro no título, texto branco
- Linhas TAMANHO e QUANTIDADE com células de grade (bordas finas), fundo branco, texto preto
- Primeira coluna: label ("TAMANHO" / "QUANTIDADE")
- Colunas seguintes: uma por tamanho existente
- Margens laterais na página (ex: 14mm cada lado)

### Alteração

**Arquivo**: `src/components/SpecializedReports.tsx` — função `drawBlockLayout` (linhas 136-191)

Reescrever para:
1. **Título**: Retângulo cheio escuro com texto branco, largura = `pageW` (área útil entre margens)
2. **Linha TAMANHO**: Célula label à esquerda + células com borda para cada tamanho — `doc.rect()` com `'S'` (stroke) em vez de `'F'` (fill)
3. **Linha QUANTIDADE**: Mesmo padrão
4. Usar `doc.setDrawColor(0)` e `doc.setLineWidth(0.3)` para bordas finas
5. Texto centralizado dentro de cada célula, cor preta
6. Margens da página mantidas pelo parâmetro `mx` já existente

Também atualizar `estimateBlockHeight` para refletir a nova altura.

