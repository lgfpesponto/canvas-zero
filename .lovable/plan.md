

## Ajustes visuais na tabela dos PDFs de produção

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx` — função `drawBlockLayout` (linhas 136-200)

1. **Aumentar fonte dos números**: Mudar fontSize das células de `6` para `7`
2. **Reduzir label e abreviar**: Mudar `labelW` de `30` para `18`, trocar `'TAMANHO'` por `'TAM.'` e `'QUANTIDADE'` por `'QTD.'`
3. **Fechar grade junto ao conteúdo**: Em vez de preencher até `pageW` (182mm), fechar a tabela na largura real `tableW` (labelW + numCols * cellW). Remover os blocos que preenchem o espaço restante. O título também usará `tableW` ao invés de `pageW`.

