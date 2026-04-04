

## Aviso ao escanear pedido já selecionado

### Problema

Ao escanear um pedido que já está selecionado, o sistema emite o beep e seleciona novamente (sem efeito real). O correto é: não emitir som e mostrar aviso "Esse pedido já está selecionado".

### Alteração: `src/pages/ReportsPage.tsx` (linhas 181-192)

Dentro do bloco `if (match)` para admin, antes de adicionar ao set, verificar se já está selecionado:

```typescript
if (match) {
  if (isAdmin) {
    setSelectedIds(prev => {
      if (prev.has(match.id)) {
        // Já selecionado — aviso sem beep
        toast.warning('Esse pedido já está selecionado');
        return prev;
      }
      const next = new Set(prev);
      next.add(match.id);
      setLastScannedNumero(match.numero);
      playBeep();
      return next;
    });
    setScanFilterId(match.id);
  } else { ... }
}
```

**Nota:** Como `setSelectedIds` recebe um callback, mover `playBeep()` e `setLastScannedNumero` para dentro do callback (apenas no caso de novo pedido) e chamar `toast.warning` no caso de duplicata.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Verificar duplicata antes de beep, mostrar aviso se já selecionado |

