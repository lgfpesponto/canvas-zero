

## Corrigir pedidos existentes de Bota Pronta Entrega

### Problema

Os pedidos `17754938588523` (preco=930, quantidade=3) e `17754939509777` (preco=1550, quantidade=5) foram criados antes da correção que salva `quantidade: 1`. O `preco` já é o total correto, mas `quantidade` ainda reflete o número de botas. Na lista, `OrderCard` exibe `preco * quantidade`, gerando valor errado.

### Solução

1. **Migration SQL** para corrigir dados existentes:
```sql
UPDATE orders 
SET quantidade = 1 
WHERE tipo_extra = 'bota_pronta_entrega' AND quantidade > 1;
```
Isso corrige todos os pedidos de bota_pronta_entrega existentes de uma vez.

2. **Safeguard no OrderCard** — no cálculo do valor exibido, para `bota_pronta_entrega` usar apenas `order.preco` (sem multiplicar por quantidade):

```typescript
// Em OrderCard.tsx, na exibição do preço:
formatCurrency(order.tipoExtra === 'bota_pronta_entrega' ? order.preco : order.preco * order.quantidade)
```

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | `UPDATE orders SET quantidade = 1 WHERE tipo_extra = 'bota_pronta_entrega' AND quantidade > 1` |
| `src/components/OrderCard.tsx` | Safeguard: não multiplicar preco por quantidade para bota_pronta_entrega |

