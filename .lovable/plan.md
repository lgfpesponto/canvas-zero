## Ajuste solicitado

Reorganizar o **Bloco 3 (Históricos)** da página de Detalhes do Pedido (`/pedido/:id`):

1. Os 3 históricos (Produção, Alterações, Impressão) ficam **lado a lado em 3 colunas** (em desktop), com **linha vertical separadora** entre eles. No mobile, empilham com linha horizontal separadora.
2. O botão **"Ver mais (N anteriores)"** ganha fundo **laranja primary** (`bg-primary text-primary-foreground`) em vez de ghost, ficando claramente identificável como botão.

## Detalhes técnicos

**Arquivo único:** `src/pages/OrderDetailPage.tsx`

- Trocar o wrapper `<div className="space-y-6">` que envolve os 3 históricos por:
  ```tsx
  <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-y md:divide-y-0 divide-border">
  ```
- Cada coluna recebe padding lateral/vertical para respirar dos divisores:
  - Coluna 1: `md:pr-5 pb-5 md:pb-0`
  - Coluna 2: `md:px-5 py-5 md:py-0`
  - Coluna 3: `md:pl-5 pt-5 md:pt-0`
- Os 3 botões "Ver mais" passam de `variant="ghost"` para botão padrão com classe:
  ```
  bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold
  ```
- Listas internas continuam: mais recente em cima, "Ver mais" expande as anteriores; mais antiga sempre por último.

## Fora do escopo
- Sem mudanças em Blocos 1 e 2, banco, lógica de cálculo ou outros componentes.
