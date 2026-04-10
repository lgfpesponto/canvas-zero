

## Não precisa reimprimir nada

Analisei o código e descobri que **todas as fichas** (antigas e novas) usam o **mesmo formato de código de barras**: os últimos 12 caracteres hexadecimais do UUID do pedido.

A função `orderBarcodeValue` sempre recebe o `order.id` (UUID), e sempre retorna os últimos 12 hex em maiúsculo. A função "legada" (`orderBarcodeValueLegacy`) nunca é chamada na geração de PDFs porque o UUID sempre tem 32+ caracteres hex.

Exemplo real do banco:
- UUID: `e078aeec-9261-479d-8e50-f574f4a79e47`
- Barcode impresso: `F574F4A79E47` (últimos 12 hex)

**O problema é apenas o padrão de busca errado na linha 230 do `useOrders.ts`.**

O código atual faz:
```
.ilike('id', '%f574-f4a79e47')   ← traço na posição errada
```

Mas o UUID real é:
```
e078aeec-9261-479d-8e50-f574f4a79e47
                        ^^^^^^^^^^^^
                        últimos 12 após o último traço
```

O padrão correto é:
```
.ilike('id', '%-f574f4a79e47')   ← traço ANTES dos 12 chars
```

### Correção

Uma única linha em `src/hooks/useOrders.ts`, linha 230:

**De:**
```typescript
.ilike('id', `%${suffix.slice(0, 4)}-${suffix.slice(4)}`)
```

**Para:**
```typescript
.ilike('id', `%-${suffix}`)
```

### Resultado

Todas as fichas já impressas (antigas e novas) vão funcionar sem reimprimir nada. O formato do barcode nunca mudou — só a busca estava com o padrão errado.

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useOrders.ts` | Linha 230: corrigir padrão ilike |

Alteração de 1 linha. Nenhuma ficha precisa ser reimpressa.

