

## Adicionar botão X para desmarcar pedidos na lista de visualização

### Alteração: `src/pages/ReportsPage.tsx` (linhas 275-279)

Adicionar um botão `X` ao lado de cada pedido na lista scrollável. Ao clicar, chama `toggle(o.id)` para desmarcar o pedido da seleção.

```typescript
<div key={o.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
  <span className="font-bold text-green-300">{o.numero}</span>
  <div className="flex items-center gap-2">
    <span className="text-gray-400">{o.status}</span>
    <button onClick={() => toggle(o.id)} className="text-red-400 hover:text-red-300 ml-2">
      <X size={16} />
    </button>
  </div>
</div>
```

Importar `X` de `lucide-react` (verificar se já está importado).

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Botão X em cada item da lista de pedidos selecionados para desmarcar |

