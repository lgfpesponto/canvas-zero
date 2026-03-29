

## Novo relatório especializado "FORMA"

### O que será feito
Adicionar um novo relatório "Forma" que é uma cópia exata do relatório "Palmilha", mudando apenas o nome/título.

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx`

1. **Tipo**: Adicionar `'forma'` ao `ReportType` (linha 34)
2. **Label**: Adicionar `forma: 'Forma'` ao `REPORT_LABELS` (linha 41-50)
3. **Função**: Criar `generateFormaPDF` copiando `generatePalmilhaPDF` (linhas 441-481), trocando `'PALMILHA'` por `'FORMA'` no título e `'Palmilha'` por `'Forma'` no nome do arquivo
4. **Switch**: Adicionar `case 'forma': generateFormaPDF(); break;` no `generateReport` (linha 996)
5. **Filtro de progresso**: Adicionar `'forma'` à condição `needsProgressFilter` (linha 1007)

**Arquivo**: `src/pages/ReportsPage.tsx`

6. Adicionar `'forma'` à lista de reports do admin (linha 890), após `'palmilha'`

