

## Editar variações inline no próprio quadro de seleção

### Problema

Atualmente, clicar no lápis abre um painel separado acima do quadro de checkboxes. O usuário quer que a edição aconteça dentro do próprio quadro — os itens customizados ficam editáveis no lugar, sem criar campos extras fora.

### Solução

Quando o admin clica no lápis, o quadro entra em "modo edição". Os itens que são opções customizadas (vindos do `custom_options`) mostram inputs editáveis de nome e valor no lugar do checkbox/label normal, com botões de salvar e excluir. Os itens estáticos (da config) ficam inalterados. Clicar no lápis novamente (ou num botão "Fechar") sai do modo edição.

### Alterações

**`src/pages/OrderPage.tsx`** — MultiSelect

- Remover o bloco `showEditPanel` separado (linhas 143-174)
- Manter o estado `showEditPanel` como flag de "modo edição"
- Dentro do grid de checkboxes (linha 188+), para cada item, verificar se é customizado (`customOptions.find(o => o.label === item.label)`)
- Se estiver em modo edição E o item for customizado: renderizar inputs de nome/valor + botões Check/Trash2 no lugar do checkbox
- Se não: renderizar o checkbox normal como está

Lógica no grid:
```typescript
{filtered.map((item, idx) => {
  const customOpt = showEditPanel && customOptions?.find(o => o.label === item.label);
  return (
    <React.Fragment key={item.label}>
      {/* separador variados igual */}
      {customOpt ? (
        <div className="col-span-full flex items-center gap-2 p-1 bg-primary/5 rounded">
          <input value={editState[customOpt.id]?.label ?? customOpt.label} onChange={...} className="flex-1 text-xs border rounded px-2 py-1" />
          {!isLaser && <input type="number" value={editState[customOpt.id]?.preco ?? customOpt.preco} onChange={...} className="w-16 text-xs border rounded px-2 py-1" />}
          <button onClick={() => onUpdateOption(customOpt.id, ...)}><Check size={12}/></button>
          <button onClick={() => onDeleteOption(customOpt.id)}><Trash2 size={12}/></button>
        </div>
      ) : (
        <label className={cls.checkItem}>/* checkbox normal */</label>
      )}
    </React.Fragment>
  );
})}
```

**`src/pages/EditOrderPage.tsx`** — Mesma alteração no MultiSelect

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/OrderPage.tsx` | Remover painel separado, edição inline no grid |
| `src/pages/EditOrderPage.tsx` | Mesma alteração |

