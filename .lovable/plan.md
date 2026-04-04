

## Expandir filtro de produtos para incluir todos os extras

### Problema

O filtro `PROD_PRODUCT_OPTIONS` só tem 4 opções (Bota, Regata, Bota P.E., Cinto). Faltam todos os outros produtos extras como Tiras Laterais, Desmanchar, Kit Canivete, etc.

### Alteração: `src/pages/Index.tsx`

**Expandir `PROD_PRODUCT_OPTIONS` (linhas 65-70)** para incluir todos os produtos extras de `EXTRA_PRODUCTS` do `extrasConfig.ts`:

```typescript
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';

const PROD_PRODUCT_OPTIONS = [
  { value: 'bota', label: 'Bota' },
  ...EXTRA_PRODUCTS.map(p => ({ value: p.id, label: p.nome })),
  { value: 'cinto', label: 'Cinto' },
];
```

Isso gera automaticamente as opções a partir da lista centralizada, incluindo: Tiras Laterais, Desmanchar, Kit Canivete, Kit Faca, Carimbo a Fogo, Revitalizador, Kit Revitalizador, Gravata Country, Adicionar Metais, Chaveiro, Bainha de Cartão, Regata, Bota P.E., Gravata P.E.

**Aumentar largura do PopoverContent** de `w-48` para `w-56` nos dois locais (admin e vendedor) para acomodar nomes mais longos.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Index.tsx` | Importar `EXTRA_PRODUCTS`, expandir opções do filtro, ajustar largura do popover |

