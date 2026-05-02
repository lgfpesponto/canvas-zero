## Mudança
No `OrderDetailPage.tsx`, no cabeçalho 2×2 do pedido detalhado, a célula "Vendedor" só aparece para admins (`showVendedor = isAdmin`). Para os usuários `vendedor` e `vendedor_comissao` a célula fica vazia.

## Ajuste
Quando o usuário não for admin (ou seja, é o próprio vendedor do pedido), substituir a célula por **"Cliente"** com o valor de `order.cliente`. Se não houver cliente preenchido, mostrar "—".

```tsx
// linha ~648
{showVendedor ? (
  <div className="...">
    <span>...Vendedor</span>
    <span>{order.vendedor}</span>
  </div>
) : (
  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</span>
    <span className="text-sm font-semibold text-right">{order.cliente || '—'}</span>
  </div>
)}
```

Não muda nada para admin_master/admin_producao (continua vendo "Vendedor"), nem afeta a regra de privacidade do cliente (já que para o próprio criador o cliente sempre é visível).

## Arquivo afetado
- `src/pages/OrderDetailPage.tsx` (célula 2 do header, ~linha 648-654)
