

## Adicionar relatório "Corte" nos Relatórios Especializados da página "Meus Pedidos"

### Alteração

#### `src/pages/ReportsPage.tsx` (linha 481)

Adicionar `'corte'` na lista de reports do admin, ao lado de `'bordados'`:

```typescript
['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos']
```

Opcionalmente, adicionar também na lista do vendedor (linha 482) se vendedores devem ter acesso.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ReportsPage.tsx` | Adicionar `'corte'` na prop `reports` do `SpecializedReports` |

