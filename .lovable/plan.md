

## Desmarcar opção ao clicar novamente nos campos de seleção

### Problema

Nos campos com `SearchableSelect` (e `select` nativo) nas fichas de produção de bota, cinto e extras, ao clicar na opção já selecionada nada acontece. O usuário quer que clicar na opção já marcada a desmarque, voltando ao estado vazio ("Selecione...").

### Alteração: `src/components/SearchableSelect.tsx`

Modificar o `onSelect` do `CommandItem` (linha 52-54) para fazer toggle: se o valor clicado for igual ao valor atual, chamar `onValueChange('')` (desmarcar); caso contrário, selecionar normalmente.

```typescript
onSelect={() => {
  onValueChange(value === o.label ? '' : o.label);
  setOpen(false);
}}
```

Essa alteração se propaga automaticamente para todos os formulários que usam `SearchableSelect` (OrderPage, BeltOrderPage, ExtrasPage, EditOrderPage, EditExtrasPage).

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SearchableSelect.tsx` | Toggle de seleção: clicar na opção já selecionada desmarca o campo |

