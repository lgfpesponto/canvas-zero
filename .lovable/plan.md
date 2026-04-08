

## Remover informação de preço dos títulos dos campos de Laser

### Alteração

Trocar os labels dos 3 campos de laser em ambos os arquivos, removendo o texto de preço entre parênteses:

- `"Laser do Cano (+R$50)"` → `"Laser do Cano"`
- `"Laser da Gáspea (+R$50)"` → `"Laser da Gáspea"`
- `"Laser da Taloneira (sem custo)"` → `"Laser da Taloneira"`

### Arquivos alterados

| Arquivo | Linhas |
|---------|--------|
| `src/pages/OrderPage.tsx` | 990, 997, 1004 |
| `src/pages/EditOrderPage.tsx` | 580, 585, 590 |

