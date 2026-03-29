

## Melhorias nos Produtos Extras

### Resumo

1. Criar componente `SearchableSelect` reutilizável (Popover + Command) para substituir selects com muitas opções
2. Aplicar nos campos de variação dos Extras (e fichas de produção se necessário)
3. Adicionar "Nossa Senhora" ao campo "Tipo de metal" da Gravata Country

### Alterações

#### 1. Novo componente `src/components/SearchableSelect.tsx`

Componente genérico que combina Popover + Command (cmdk) para criar um select com busca por digitação:
- Props: `options: string[]`, `value: string`, `onValueChange: (v: string) => void`, `placeholder?: string`
- Ao clicar abre popover com campo de busca e lista filtrada
- Selecionar uma opção fecha o popover e chama `onValueChange`

#### 2. `src/pages/ExtrasPage.tsx` — Substituir selects por SearchableSelect

Campos que possuem listas de variações serão trocados:
- **Kit Canivete / Kit Faca**: Tipo de couro (`TIPOS_COURO`), Cor do couro (`CORES_COURO`)
- **Gravata Country**: Cor da tira, Tipo de metal, Cor do bridão
- **Chaveiro / Bainha**: Tipo de couro, Cor do couro
- **Regata**: Cor
- **Revitalizador / Kit Revitalizador**: Tipo
- **Desmanchar**: Qual sola
- **Carimbo a fogo**: Qtd carimbos (poucos itens, pode manter Select normal)

Campos com apenas 2 opções (Sim/Não) continuam como Select normal.

#### 3. `src/pages/ExtrasPage.tsx` — "Nossa Senhora" na Gravata Country

Na linha 354, adicionar `'Nossa Senhora'` ao array de tipos de metal:
```
['Bota', 'Chapéu', 'Mula', 'Touro', 'Bridão Estrela', 'Bridão Flor', 'Cruz', 'Nossa Senhora']
```

#### 4. Fichas de produção (se necessário)

Verificar `OrderPage.tsx` e `BeltOrderPage.tsx` — atualmente usam Select normal. Aplicar `SearchableSelect` nos campos com muitas opções (cores de couro, modelos, etc.) para consistência.

### Detalhes técnicos

- O componente usa `cmdk` (Command) + Popover do shadcn, ambos já instalados no projeto
- Filtro case-insensitive via `CommandInput` nativo do cmdk
- O componente é reutilizável em qualquer página do sistema

