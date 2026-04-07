

## Corrigir relatório de Bainha de Cartão nos Extras

### Problema

O produto "Bainha de Cartão" (`bainha_cartao`) está na lista de produtos do relatório de extras (linha 72), mas não possui entrada no objeto `EXTRAS_DETAIL_FIELDS` (linhas 77-131). Por isso, ao selecionar "Bainha de Cartão" no relatório, não aparecem campos para agrupar e o PDF não é gerado.

A bainha de cartão possui os campos `tipoCouro` e `corCouro` (conforme definido em `ExtrasPage.tsx` linha 179), igual ao kit_faca.

### Alteração

**Arquivo: `src/components/SpecializedReports.tsx`**

Adicionar entrada `bainha_cartao` no objeto `EXTRAS_DETAIL_FIELDS` (após a entrada de `kit_canivete`, ~linha 96):

```typescript
bainha_cartao: [
  { key: 'tipoCouro', label: 'Tipo de Couro' },
  { key: 'corCouro', label: 'Cor do Couro' },
],
```

Isso permite selecionar os campos de agrupamento e gerar o PDF com tipo de couro, cor e quantidade — igual ao kit_faca.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Adicionar `bainha_cartao` ao `EXTRAS_DETAIL_FIELDS` com campos tipoCouro e corCouro |

