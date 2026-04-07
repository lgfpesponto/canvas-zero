

## Corrigir composição de Bota Pronta Entrega nos PDFs de Expedição e Cobrança

### Problema

O formulário salva cada bota com campos `descricaoProduto` e `valorManual`, mas as funções `buildCompositionItems` (usada pelo PDF de Expedição) e o código inline do PDF de Cobrança leem `b.descricao` e `b.valor` — campos que não existem no banco. Por isso a composição aparece como "Bota 1 R$ 0,00" em vez da descrição e valor reais.

### Solução

Corrigir os nomes dos campos em dois locais do `SpecializedReports.tsx`:

**1. `buildCompositionItems`** (~linha 275-276)
De:
```typescript
priceItems.push([b.descricao || `Bota ${i + 1}`, parseFloat(b.valor) || 0]);
```
Para:
```typescript
priceItems.push([b.descricaoProduto || `Bota ${i + 1}`, parseFloat(b.valorManual) || 0]);
```

**2. `generateCobrancaPDF` inline** (~linha 1162-1163)
Mesma correção:
```typescript
priceItems.push([b.descricaoProduto || `Bota ${i + 1}`, parseFloat(b.valorManual) || 0]);
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Corrigir `b.descricao` → `b.descricaoProduto` e `b.valor` → `b.valorManual` nos dois locais |

