

## Adicionar som de erro ao escanear pedido duplicado ou inválido

### Alteração: `src/pages/ReportsPage.tsx`

#### 1. Criar função `playErrorBeep`

Junto ao `playBeep` existente (linha 65), adicionar uma nova função com tom mais grave e mais longo para indicar erro:

```typescript
const playErrorBeep = useCallback(() => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 400;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}, []);
```

#### 2. Emitir som de erro nos dois cenários

- **Pedido já selecionado (linha 185):** adicionar `playErrorBeep()` junto ao `toast.warning`
- **Pedido não encontrado (linha 200):** adicionar `playErrorBeep()` junto ao `toast.error`

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Nova função `playErrorBeep` + chamada nos cenários de erro e duplicata |

