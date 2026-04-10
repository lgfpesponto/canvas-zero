

## Correção de dois bugs

### Bug 1: Valor duplicado na lista de pedidos para extras

**Causa**: Para produtos extras como `revitalizador`, o campo `preco` no banco já armazena o valor total (ex: 10 unidades x R$10 = R$100, `preco=100`). Porém o `quantidade` também é 10. No `OrderCard.tsx` linha 43, o cálculo `order.preco * order.quantidade` resulta em R$1000 (duplicado).

**Correção**: Extras devem exibir apenas `order.preco` sem multiplicar por quantidade. A condição atual só trata `bota_pronta_entrega` como caso especial, mas **todos os extras** armazenam o total no `preco`.

**Arquivo: `src/components/OrderCard.tsx`** (linha 43)
- Mudar de: `order.tipoExtra === 'bota_pronta_entrega' ? order.preco : order.preco * order.quantidade`
- Para: `order.tipoExtra ? order.preco : order.preco * order.quantidade`

Mesma lógica deve ser verificada em `TrackOrderPage.tsx` e qualquer outro local que faça `preco * quantidade` sem checar se é extra.

### Bug 2: Gráfico de vendas — formato de semana errado

**Causa**: A função SQL `get_sales_chart` usa `to_char(d.dt, 'IW')` que retorna o número da semana ISO (ex: "Sem 14"). O usuário quer o formato "Sem X/M" onde X = semana do mês e M = número do mês.

**Correção**: Migration SQL para alterar a função, substituindo:
```sql
WHEN 'semana' THEN 'Sem ' || to_char(d.dt, 'IW')
```
Por:
```sql
WHEN 'semana' THEN 'Sem ' || CEIL(EXTRACT(DAY FROM d.dt) / 7.0)::int || '/' || EXTRACT(MONTH FROM d.dt)::int
```

Isso gera labels como "Sem 1/4", "Sem 2/4" para abril e "Sem 4/3" para março.

### Resumo de alterações

| Arquivo | Mudança |
|---------|---------|
| `src/components/OrderCard.tsx` | Usar `order.preco` para todos os extras |
| `src/pages/TrackOrderPage.tsx` | Mesma correção se aplicável |
| Migration SQL | Atualizar `get_sales_chart` com formato semana/mês |

