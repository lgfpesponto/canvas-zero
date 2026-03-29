

## Adicionar "Forma" nos relatórios do dashboard

### Problema
O relatório "Forma" foi adicionado apenas na página "Meus Pedidos" (`ReportsPage.tsx`), mas não nas listas de relatórios especializados do dashboard (`Index.tsx`).

### Alterações

**Arquivo**: `src/pages/Index.tsx`

1. **Linha 100** (dashboard Fernanda): Adicionar `'forma'` após `'palmilha'`
   - De: `['escalacao', 'forro', 'palmilha', 'pesponto', 'bordados', 'expedicao', 'extras_cintos']`
   - Para: `['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'bordados', 'expedicao', 'extras_cintos']`

2. **Linha 239** (dashboard Admin): Adicionar `'forma'` após `'palmilha'`
   - De: `['escalacao', 'forro', 'palmilha', 'pesponto', 'bordados', 'expedicao', 'cobranca', 'extras_cintos']`
   - Para: `['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'bordados', 'expedicao', 'cobranca', 'extras_cintos']`

