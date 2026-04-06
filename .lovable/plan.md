

## Adicionar linha separatória laranja entre pedidos nos quadros

### Alteração em `src/components/SoladoBoard.tsx`

Na div que contém a lista de pedidos (com `divide-y divide-border`), substituir a classe de divisão para usar uma cor laranja e espessura maior:

- Trocar `divide-y divide-border` por `divide-y-2 divide-primary` (primary é laranja no tema)

Isso aplica uma linha de 2px na cor primária (laranja) entre cada pedido.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Classe da lista: `divide-y divide-border` → `divide-y-2 divide-primary` |

