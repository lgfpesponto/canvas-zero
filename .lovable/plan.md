

## Criar relatório especializado "PESPONTO" (tabular)

### Situação atual
O tipo `'pesponto'` já existe mas está sendo usado para o relatório de **Metais** (label "Metais"). Preciso renomear o existente e criar o novo Pesponto.

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx`

#### 1. Renomear o tipo existente `'pesponto'` → `'metais'`
- No `ReportType`: trocar `'pesponto'` por `'metais'`
- No `REPORT_LABELS`: trocar key `pesponto` por `metais`
- Renomear função `generatePespontoPDF` → `generateMetaisPDF`
- No switch `generateReport`: `case 'metais': generateMetaisPDF()`
- No `needsProgressFilter`: trocar `'pesponto'` por `'metais'`

#### 2. Adicionar novo tipo `'pesponto'` com label "Pesponto"
- Adicionar `'pesponto'` ao `ReportType`
- Adicionar `pesponto: 'Pesponto'` ao `REPORT_LABELS`
- Adicionar `'pesponto'` ao `needsProgressFilter`

#### 3. Criar função `generatePespontoPDF` (novo relatório tabular)
Layout em tabela com 4 colunas:

| Nº PEDIDO | CÓDIGO DE BARRAS | INFORMAÇÕES DE SOLADO | QTD |
|-----------|------------------|----------------------|-----|
| 10452 | [barcode image] | Sola borracha bico quadrado cor marrom vira rosa forma 2300 | 2 |

- Filtrar pedidos por `filterProgresso` (somente botas, sem extras/cintos)
- Colunas: `[25, 45, 85, 27]` (nº pedido, código barras, solado info, qtd)
- Coluna código de barras: usar `barcodeDataUrl(orderBarcodeValue(o.numero, o.id))` e `doc.addImage`
- Coluna solado: concatenar `solado + formato_bico + cor_sola + cor_vira + forma`
- Linha final: TOTAL com soma das quantidades
- Título: `PESPONTO — {PROGRESSO} — {DATA}`
- Nome arquivo: `Pesponto - {Progresso} - {Data}.pdf`
- Usar helpers `drawTableHeader` e `drawTableRow` já existentes

**Arquivos**: `src/pages/Index.tsx` e `src/pages/ReportsPage.tsx`

#### 4. Atualizar listas de relatórios
- Trocar `'pesponto'` por `'metais'` e adicionar `'pesponto'` em todas as listas:
  - `Index.tsx` Fernanda (linha 100): `[..., 'forma', 'pesponto', 'metais', 'bordados', ...]`
  - `Index.tsx` Admin (linha 239): `[..., 'forma', 'pesponto', 'metais', 'bordados', ...]`
  - `ReportsPage.tsx` admin (linha 890): `[..., 'forma', 'pesponto', 'metais', 'bordados', ...]`

