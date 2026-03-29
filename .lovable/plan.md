

## Alterações na Ficha de Produção "Cinto"

### 1. Nova categoria "Fivela" (`BeltOrderPage.tsx`)

**Novo state**: `fivela` (string, default `''`), `fivelaOutroDesc` (string, default `''`)

**Constante** (no topo do arquivo ou em `extrasConfig.ts`):
```ts
const FIVELA_OPTIONS = ['Prata com Strass', 'Preta com Strass', 'Prata Touro', 'Prata Flor', 'Infantil', 'Quadrada', 'Outro'];
```

**UI**: Nova `<Section title="Fivela">` após a seção Couro, com `<select>` das opções. Se `fivela === 'Outro'`, mostrar campo texto "Descrever fivela".

**Integração**: Salvar em `extraDetalhes.fivela` e `extraDetalhes.fivelaOutroDesc`. Adicionar ao mirror, draft e restauração de draft.

### 2. Novo campo "Adicional" (`BeltOrderPage.tsx`)

**Novos states**: `adicionalValor` (string, default `''`), `adicionalDesc` (string, default `''`)

**UI**: Nova seção antes de "Observação" com dois campos: valor (input number) e descrição (input text).

**Preço**: Somar `parseFloat(adicionalValor) || 0` ao `total`.

**Integração**: Salvar `adicional_valor` e `adicional_desc` no pedido (campos já existem na tabela `orders`). Adicionar ao mirror, draft e restauração.

### 3. Novo canhoto "Bordado" no PDF (`ReportsPage.tsx`)

Na seção de stubs do cinto (linhas 347-378), alterar de 2 canhotos para 3:
- Dividir `stubAreaW` por 3 em vez de 2
- Inserir stub "BORDADO" como primeiro, seguido de "PESPONTO" e "EXPEDIÇÃO"
- Cada stub mantém o mesmo padrão: título em bold, código de barras e número do pedido

### 4. Labels em `extrasConfig.ts`

Adicionar labels para `fivela` e `fivelaOutroDesc` em `EXTRA_DETAIL_LABELS`.

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/BeltOrderPage.tsx` | States fivela + adicional, UI sections, mirror, draft, confirmOrder |
| `src/pages/ReportsPage.tsx` | 3 canhotos no PDF do cinto (Bordado + Pesponto + Expedição) |
| `src/lib/extrasConfig.ts` | FIVELA_OPTIONS, labels para fivela/fivelaOutroDesc |

