

## Plano: Adicionar campo de busca nos dois painéis de edição de variações

### Problema
Os dois dialogs de edição de variações dentro de `AdminConfigFichaPage.tsx` não possuem campo de busca — apenas `AdminConfigVariacoesPage.tsx` (rota `/admin/configuracoes/:slug/:categoriaId`) tem a lupa.

### Alterações

#### Arquivo: `src/pages/AdminConfigFichaPage.tsx`

**1. Dialog do `AdminEditableOptions` (linha ~413)**
- Adicionar estado `varSearchTerm` (ou reutilizar nome similar)
- Inserir input com ícone `Search` entre a barra de ações (linha ~440) e a lista de variações (linha ~448)
- Filtrar `editItems` por `item.nome` (case-insensitive) antes do `.map()`
- Limpar o filtro ao abrir/fechar o dialog

**2. Dialog do `CampoEditavel` / `editDialog` (linha ~1354)**
- Adicionar estado `varSearchTerm` no componente
- Inserir input com ícone `Search` entre a barra de ações (linha ~1366) e a lista (linha ~1374)
- Filtrar `Object.entries(editState)` por `item.nome` antes do `.map()`
- Limpar o filtro ao abrir/fechar o dialog

### Layout dentro dos Dialogs
```text
┌─────────────────────────────────────────────┐
│ editar variações — [nome]                   │
├─────────────────────────────────────────────┤
│ [Salvar] [Cancelar] [Ed. massa]             │
│ [🔍 Pesquisar variações...                ] │  ← NOVO
│                                             │
│  ☐ Couro Nobuck        R$ 50.00  ↑↓ 🔗 🗑  │
│  ☐ Couro Liso          R$ 0.00   ↑↓ 🔗 🗑  │
│  ...                                       │
└─────────────────────────────────────────────┘
```

### O que NÃO muda
- Lógica de salvar, reordenar, relacionamentos, edição em massa
- `AdminConfigVariacoesPage.tsx` já tem busca e permanece igual

