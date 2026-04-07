

## Filtro de progresso dos Extras com status próprio

### Problema

O filtro de progresso de produção no relatório de Extras/Cintos usa `PRODUCTION_STATUSES` (status de botas: Corte, Bordado, Pesponto, etc.), mas os extras têm seus próprios status definidos em `EXTRAS_STATUSES`: "Em aberto", "Produzindo", "Expedição", "Entregue", "Cobrado", "Pago".

### Solução

Quando o relatório ativo for `extras_cintos`, usar `EXTRAS_STATUSES` no dropdown de progresso em vez de `PRODUCTION_STATUSES`.

### Alterações em `src/components/SpecializedReports.tsx`

1. **Importar `EXTRAS_STATUSES`** na linha 3 (adicionar ao import de `AuthContext`)

2. **Alterar `progressOptions`** (~linha 1386-1388): retornar `EXTRAS_STATUSES` quando `activeReport === 'extras_cintos'`, caso contrário `PRODUCTION_STATUSES`

```typescript
const progressOptions = useMemo(() => {
  if (activeReport === 'extras_cintos') return EXTRAS_STATUSES;
  return PRODUCTION_STATUSES;
}, [activeReport]);
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Import de `EXTRAS_STATUSES`, dropdown usa status correto para extras |

