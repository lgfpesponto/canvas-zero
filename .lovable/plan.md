

## Alterações em variações e campos do sistema

### 1. Renomear variações em `src/lib/orderFieldsConfig.ts`

- **Modelo**: `'Bota Ouver Perfilado'` → `'Bota Over'` (linha 16, e nas referências em `getModelosForTamanho` linha 296 e `PERFILADO_MODELOS` linha 323)
- **Cor da linha**: `'Marrom'` → `'Café'` no array `COR_LINHA` (linha 196)
- **Cor do vivo**: `'Escuro'` → `'Preto'` no array `COR_VIVO` (linha 203)

### 2. Nova cor de couro: "Castor"

Adicionar `'Castor'` ao array `CORES_COURO` em `src/lib/orderFieldsConfig.ts` (linha ~85 do bloco de cores). Como `CORES_COURO` é importado em todos os formulários (botas, extras, cintos), a adição aparece automaticamente em todos.

### 3. Gravata Pronta Entrega — Campo "Cor do brilho"

**Banco de dados**: Adicionar coluna `cor_brilho` (text, nullable, default null) à tabela `gravata_stock` via migração.

**Config** (`src/lib/extrasConfig.ts`):
- Adicionar constante: `COR_BRILHO_GRAVATA = ['Preto', 'Azul', 'Rosa', 'Cristal']`
- Adicionar label em `EXTRA_DETAIL_LABELS`: `corBrilho: 'Cor do Brilho'`

**UI — Organizar estoque** (`src/pages/ExtrasPage.tsx`):
- Adicionar state `stockCorBrilho`
- No form de adicionar estoque, quando `stockTipoMetal` for `'Bridão Flor'` ou `'Bridão Estrela'`, mostrar campo "Cor do brilho" com as 4 opções
- Incluir `cor_brilho` no insert/update do estoque
- Exibir `cor_brilho` na lista de variações cadastradas (quando presente)

**UI — Compra da gravata**:
- Na lista de variações disponíveis (linha 444), exibir a cor do brilho quando presente: `{item.cor_tira} + {item.tipo_metal} + {item.cor_brilho}`
- Incluir `corBrilho` nos detalhes do pedido gravata quando o item selecionado tiver `cor_brilho`

**Tipo StockItem**: Atualizar a interface local para incluir `cor_brilho?: string`

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/orderFieldsConfig.ts` | Renomear modelo, cor linha, cor vivo; adicionar "Castor" |
| `src/lib/extrasConfig.ts` | Adicionar `COR_BRILHO_GRAVATA` e label |
| `src/pages/ExtrasPage.tsx` | Campo cor do brilho no estoque e na compra |
| Migração SQL | Coluna `cor_brilho` em `gravata_stock` |

