

## Corrigir informações de extras embutidos nos relatórios e detalhes

### Problemas identificados

1. **OrderDetailPage** (linha 416-418): Na seção de detalhes da bota, os extras embutidos mostram as chaves brutas dos campos (`metaisSelecionados`, `qtdStrass`) em vez dos labels amigáveis já definidos em `EXTRA_DETAIL_LABELS` (ex: "Metais Selecionados", "Qtd. de Strass").

2. **SpecializedReports PDFs** (Expedição e Cobrança): Na composição, os extras embutidos mostram apenas o tipo e preço (ex: "↳ Adicionar Metais R$ 7,20") mas sem detalhe do que foi selecionado. Para consistência com a visão de detalhes, adicionar info resumida (ex: "↳ Adicionar Metais (Strass x12) R$ 7,20").

3. **Caractere ↳ no PDF**: O jsPDF com fonte helvetica não renderiza o caractere `↳`. Trocar por `"  > "` ou `"  - "` para garantir exibição correta.

### Alterações

**1. `src/pages/OrderDetailPage.tsx`** — Linha 418

Trocar `{k}` por label amigável usando `EXTRA_DETAIL_LABELS`:

```typescript
import { EXTRA_DETAIL_LABELS } from '@/lib/extrasConfig';

// Linha 418:
<span>{EXTRA_DETAIL_LABELS[k] || k}</span>
```

**2. `src/components/SpecializedReports.tsx`** — buildCompositionItems (linha 278-281) e cobrança (linha 1176-1179)

Adicionar detalhes resumidos ao label do extra embutido e trocar `↳` por `>`:

```typescript
b.extras.forEach((ex: any) => {
  const LABELS = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
  let detail = '';
  if (ex.tipo === 'adicionar_metais' && Array.isArray(ex.dados?.metaisSelecionados)) {
    const parts = [];
    if (ex.dados.metaisSelecionados.includes('Bola grande')) parts.push('Bola grande');
    if (ex.dados.metaisSelecionados.includes('Strass')) parts.push(`Strass x${ex.dados.qtdStrass || 1}`);
    detail = parts.length ? ` (${parts.join(', ')})` : '';
  } else if (ex.tipo === 'carimbo_fogo') {
    detail = ` (${ex.dados?.qtdCarimbos || 1} carimbos)`;
  } else if (ex.tipo === 'tiras_laterais' && ex.dados?.corTiras) {
    detail = ` (${ex.dados.corTiras})`;
  }
  priceItems.push([`  > ${LABELS[ex.tipo] || ex.tipo}${detail}`, ex.preco || 0]);
});
```

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderDetailPage.tsx` | Labels amigáveis nos dados dos extras embutidos |
| `src/components/SpecializedReports.tsx` | Detalhes resumidos nos extras da composição + trocar ↳ por > nos PDFs |

