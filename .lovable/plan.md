

## Botão "Feito" na mesma linha do Prazo/Status

### O que muda

O botão "Feito" (com ícone Check) fica na **mesma linha** do Prazo e Status, alinhado à direita. Layout da Row 3:

```text
│ Prazo: 15d  │  Status: Corte  │  [✓ Feito]  │
```

### Alteração em `src/components/SoladoBoard.tsx`

Na Row 3 (linha do Prazo/Status, ~linhas 305-319), adicionar uma terceira coluna com o botão "Feito" à direita, com `border-l` separando-o do Status. Remover o botão "Feito" da Row 1 (header com checkbox/número/vendedor).

Layout da Row 3:
```tsx
<div className="border-t border-border mt-2 flex text-xs">
  <div className="flex-1 py-1.5 pr-2 border-r border-border">
    <span className="text-muted-foreground">Prazo: </span>
    <span className="font-semibold">{prazo}</span>
  </div>
  <div className="flex-1 py-1.5 px-2 border-r border-border">
    <span className="text-muted-foreground">Status: </span>
    <span className="font-bold">{status}</span>
  </div>
  <div className="py-1 px-2 flex items-center">
    <button onClick={() => dismiss(o.id)} className="px-3 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
      <Check size={14} /> Feito
    </button>
  </div>
</div>
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SoladoBoard.tsx` | Remover botão Feito da Row 1, adicionar na Row 3 ao lado do Status com ícone Check |

