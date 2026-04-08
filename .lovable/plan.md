

## Editar variações inline — transformar checkboxes em campos editáveis

### Problema

Quando o admin clica no lápis, os itens customizados aparecem como uma div separada (`col-span-full`) abaixo dos outros itens, quebrando o layout do grid. O usuário quer que cada item customizado fique editável **no mesmo lugar** do checkbox, mantendo a posição no grid, e que apareçam botões "Salvar" e "Cancelar" no topo do quadro.

### Solução

Quando `showEditPanel` está ativo:
- Cada item customizado renderiza no mesmo espaço do grid (sem `col-span-full`), substituindo o checkbox/label por inputs de nome e valor editáveis
- Itens estáticos ficam como checkboxes normais (desabilitados ou inalterados)
- No topo do grid (acima dos itens), aparecem botões "Salvar" e "Cancelar"
- "Salvar" chama `onUpdateOption` para cada item alterado e fecha o modo edição
- "Cancelar" descarta alterações e fecha o modo edição

### Alterações em ambos os arquivos

**`src/pages/OrderPage.tsx`** e **`src/pages/EditOrderPage.tsx`** — MultiSelect

1. Remover `col-span-full` dos itens customizados editáveis — cada item fica na mesma célula do grid que o checkbox ocuparia

2. Substituir a renderização do item customizado em modo edição:
```typescript
{customOpt ? (
  <div className="flex flex-col gap-1 p-1 bg-primary/5 rounded border border-primary/20">
    <input type="text" value={editState[customOpt.id]?.label} onChange={...} className="text-xs border rounded px-2 py-1 w-full" />
    {!isLaser && <input type="number" value={editState[customOpt.id]?.preco} onChange={...} className="text-xs border rounded px-2 py-1 w-full" placeholder="R$" />}
  </div>
) : (
  <label>/* checkbox normal */</label>
)}
```

3. Adicionar barra de ações no topo do grid quando `showEditPanel` está ativo:
```typescript
{showEditPanel && (
  <div className="col-span-full flex justify-end gap-2 mb-1">
    <button onClick={handleSaveAll}>Salvar</button>
    <button onClick={() => setShowEditPanel(false)}>Cancelar</button>
  </div>
)}
```

4. Criar função `handleSaveAll` que itera sobre `editState`, compara com `customOptions` original, e chama `onUpdateOption` apenas para itens que mudaram. Depois fecha o modo edição.

5. Remover os botões Check/Trash2 individuais de cada item — salvar é em lote pelo botão no topo. Manter apenas o Trash2 individual para exclusão.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | MultiSelect: items editáveis no lugar, botões Salvar/Cancelar no topo |
| `src/pages/EditOrderPage.tsx` | Mesma alteração |

