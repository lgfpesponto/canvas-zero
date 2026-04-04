

## Relatório "Corte" — Novo relatório especializado

### Resumo

Criar um novo relatório "Corte" seguindo o mesmo layout tabular do relatório de Bordados (4 colunas, mesma estrutura de tabela, espaçamento, paginação). A diferença está no conteúdo: descrição do corte com couros/modelo/tamanho, ordenação por tipo+cor de couro, e QR code da foto.

### Alterações

#### 1. `src/components/SpecializedReports.tsx`

**Adicionar tipo `'corte'` ao `ReportType`** (linha 34):
```typescript
type ReportType = '...' | 'corte';
```

**Adicionar label** no `REPORT_LABELS` (linha 41):
```typescript
corte: 'Corte',
```

**Adicionar `'corte'` ao `needsProgressFilter`** (linha 1158) para que o filtro de progresso apareça.

**Criar função `generateCortePDF`** (async, mesma estrutura do `generateBordadosPDF`):

- **Filtro**: pedidos sem `tipoExtra` (apenas botas), filtrados por `filterProgresso`
- **Ordenação**: por `couroCano` + `corCouroCano` (agrupa mesmo couro/cor lado a lado, sem somar)
- **Colunas**: `Nº PEDIDO (25) | DESCRIÇÃO DO CORTE (90) | QR CODE (25) | CHECK (42)`
- **Descrição do corte**: concatenar os couros das 3 regiões (cano, gáspea, taloneira) com suas cores, modelo, tamanho, gênero, e observação (se houver). Formato:
  ```
  Cano: [couro] [cor] | Gáspea: [couro] [cor] | Talon.: [couro] [cor]
  [modelo] – [tamanho] – [gênero]
  Obs: [observação]    (só se existir)
  ```
- **QR Code**: mesmo do bordado — `qrDataUrl(o.fotos?.[0])`, inserido como imagem 14x14
- **CHECK**: coluna vazia (retângulo já desenhado pelo `drawTableRow`), espaço para marcar manualmente
- **Título do PDF**: `Relatório de Corte — 7ESTRIVOS`
- **Nome do arquivo**: `relatorio-corte.pdf`

**Adicionar case no `generateReport`** (linha 1142):
```typescript
case 'corte': generateCortePDF(); break;
```

#### 2. `src/pages/Index.tsx`

Adicionar `'corte'` à lista de `reports` nos dois locais onde `SpecializedReports` é usado (admin e vendedor).

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Novo tipo, label, função PDF, case no switch, filtro de progresso |
| `src/pages/Index.tsx` | Adicionar `'corte'` nas props `reports` |

