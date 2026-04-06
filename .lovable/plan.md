

## Adicionar campo de busca nos campos de Laser (Cano, Gáspea, Taloneira)

### Problema

Os campos de Laser (MultiSelect) não possuem campo de busca/pesquisa, enquanto os campos de Bordado possuem. O usuário quer o mesmo comportamento de busca nos campos de laser.

### Solução

O componente `MultiSelect` (linha 63-113 em `OrderPage.tsx`) já possui lógica de busca, mas ela só é ativada quando `label.toLowerCase().includes('bordado')` (linha 69).

Basta expandir essa condição para incluir também labels que contenham "laser":

```typescript
// Linha 69 — de:
const isBordado = label.toLowerCase().includes('bordado');

// Para:
const hasSearch = label.toLowerCase().includes('bordado') || label.toLowerCase().includes('laser');
```

E substituir todas as referências a `isBordado` por `hasSearch` nas linhas 78 e 93. O placeholder do input de busca pode ser ajustado para ser genérico ("Pesquisar...") quando for laser.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Expandir condição de busca no MultiSelect para incluir "laser" (linhas 69, 78, 93) |

