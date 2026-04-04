

## Painel Grande de Leitura de Código de Barras + Som de Confirmação

### Resumo

Substituir o feedback atual (toast pequeno + linha discreta) por um painel grande, fixo e persistente que aparece quando o scanner está ativo E há pedidos selecionados. Adicionar som de confirmação a cada leitura bem-sucedida.

### Alterações: `src/pages/ReportsPage.tsx`

#### 1. Estado para último pedido escaneado

Adicionar estado:
```typescript
const [lastScannedNumero, setLastScannedNumero] = useState<string | null>(null);
```

#### 2. Atualizar `handleScan` (linhas 146-172)

- Quando encontrar pedido: setar `setLastScannedNumero(match.numero)` e tocar som de confirmação
- Remover os `toast.success`/`toast.info` de seleção (substituídos pelo painel)
- Manter `toast.error` para pedido não encontrado
- Som: usar `AudioContext` para gerar beep curto (sem arquivo externo)

```typescript
const playBeep = useCallback(() => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 1200;
  gain.gain.value = 0.3;
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}, []);
```

#### 3. Substituir scanner bar pequeno (linhas 236-266)

Manter o input de scanner (campo de texto + botão buscar) mas quando `showScanner && selectedIds.size > 0`, renderizar um **painel grande fixo** no lugar:

```
┌──────────────────────────────────────────┐
│  ✅ Último pedido: 001234                │
│                                          │
│       8 pedidos selecionados             │
│                                          │
│  [input de scanner]           [Buscar]   │
│                                          │
│  [Mudar progresso]    [Limpar seleção]   │
└──────────────────────────────────────────┘
```

Estilo:
- `bg-gray-900 text-white` (fundo escuro, alto contraste)
- Número do último pedido em `text-3xl font-bold text-green-400`
- Contador em `text-2xl font-bold`
- Padding generoso (`p-8`), `rounded-2xl`, `shadow-2xl`
- Input de scanner continua funcional dentro do painel
- Botão "Mudar progresso de produção" movido para dentro do painel
- Botão "Limpar seleção" para fechar/resetar

#### 4. Quando o painel desaparece

- Quando `selectedIds.size === 0` (limpar seleção ou após atualizar progresso)
- Quando o scanner é fechado (`showScanner = false`)
- Reset de `lastScannedNumero` ao limpar seleção

#### 5. Remover botão duplicado

O botão "Mudar progresso de produção" que fica no topo (linhas 221-232) deve ser mantido para quando o scanner NÃO está ativo, mas escondido quando o painel grande está visível (para não duplicar).

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Painel grande de scanner, som de confirmação, estado de último pedido escaneado |

