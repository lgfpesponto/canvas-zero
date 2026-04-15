

## Plano: Adicionar campo de busca na listagem de variações

### O que muda
Adicionar um campo de pesquisa com ícone de lupa acima da tabela de variações em `AdminConfigVariacoesPage.tsx`, permitindo filtrar as variações pelo nome enquanto digita.

### Alteração

#### Arquivo: `src/pages/AdminConfigVariacoesPage.tsx`

1. Adicionar estado `searchTerm` (`useState('')`)
2. Inserir um `Input` com ícone `Search` (lucide) entre o cabeçalho e o `Card` da tabela
3. Filtrar `variacoes` pelo `searchTerm` antes de renderizar no `TableBody` — filtro case-insensitive por `nome`
4. Mostrar mensagem "Nenhuma variação encontrada" quando o filtro não retornar resultados

### Layout
```text
[← voltar]
[título: variações]                    [entrada em massa]
[🔍 Pesquisar variações...                              ]
┌──────────────────────────────────────────────────────┐
│ #  │ Nome          │ Preço Adicional │ Ativo │  🗑   │
│ 1  │ Couro Nobuck  │ 50.00           │  ✓    │  ...  │
│ 2  │ Couro Liso    │ 0.00            │  ✓    │  ...  │
└──────────────────────────────────────────────────────┘
```

### O que NÃO muda
- Lógica de edição inline, exclusão, entrada em massa
- Ordenação e dados no banco

