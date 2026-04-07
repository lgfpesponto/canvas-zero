

## Mostrar quantidade total no resumo de Bota Pronta Entrega

### O que muda

Abaixo do "Valor total" no formulário de Bota Pronta Entrega, exibir a quantidade total de botas no pedido (ex: "Quantidade total: 3").

### Alteração em `src/pages/ExtrasPage.tsx`

Na linha 651, após o div do "Valor total", adicionar condicionalmente (quando `productId === 'bota_pronta_entrega'`) uma linha mostrando `Quantidade total: {botasPE.length}`:

```typescript
{productId === 'bota_pronta_entrega' && (
  <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
    <span>Quantidade total:</span>
    <span>{botasPE.length}</span>
  </div>
)}
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ExtrasPage.tsx` | Adicionar linha de quantidade total abaixo do valor total para bota pronta entrega |

