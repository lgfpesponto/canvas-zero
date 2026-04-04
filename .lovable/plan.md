

## Corrigir seleção de cor do brilho no estoque de Gravata Pronta Entrega

### Problema

O `SearchableSelect` usa internamente um `Popover` que renderiza via Portal fora do DOM do `Dialog`. Como o `Dialog` do Radix é modal por padrão, ele pode interceptar cliques em elementos portalizados, impedindo a seleção de opções no dropdown de "Cor do brilho" (que aparece condicionalmente após selecionar Bridão Estrela/Flor).

### Solução

Substituir os 3 `SearchableSelect` do formulário de estoque (dentro do Dialog "Organizar Estoque") por elementos `<select>` nativos. Isso elimina o conflito entre Portal do Popover e modal do Dialog.

### Alteração: `src/pages/ExtrasPage.tsx` (linhas 675-688)

Trocar os SearchableSelect por selects nativos para:
- **Cor da tira** (linha 677)
- **Tipo de metal** (linha 681)
- **Cor do brilho** (linha 686)

Exemplo:
```typescript
<select
  value={stockCorTira}
  onChange={e => setStockCorTira(e.target.value)}
  className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border"
>
  <option value="">Selecione</option>
  {GRAVATA_COR_TIRA.map(c => <option key={c} value={c}>{c}</option>)}
</select>
```

Mesma abordagem para tipo_metal (mantendo a lógica de limpar corBrilho) e cor_brilho.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | Trocar SearchableSelect por select nativo no formulário de estoque dentro do Dialog |

