## Mudança
No `OrderDetailPage.tsx` (linha 154), a regra `showCliente` atual mostra o campo "Cliente" no bloco "Detalhes da Bota" para todo usuário não-admin. O usuário quer alinhar com a ficha impressa: o cliente só deve aparecer quando o pedido for de **Juliana Cristina Ribeiro** (admin_master, clientes virtuais) ou de **Rancho Chique** (vendedor_comissao).

## Ajuste
Trocar a condição:

```ts
// antes
const showCliente = !isAdmin || order.vendedor === 'Rancho Chique';

// depois
const showCliente =
  order.vendedor === 'Juliana Cristina Ribeiro' ||
  order.vendedor === 'Rancho Chique';
```

Assim:
- Vendedor comum: NÃO vê "Cliente" no bloco Identificação dos detalhes da bota.
- vendedor_comissao (Rancho Chique): continua vendo.
- admin_master (Juliana): vê apenas em pedidos próprios (clientes virtuais).
- admin_producao: vê apenas nos pedidos de Juliana/Rancho Chique (alinhado à ficha impressa).

A célula "Cliente" no cabeçalho 2×2 (adicionada agora há pouco para vendedor/comissão) **permanece**, pois é a substituição do campo "Vendedor".

## Arquivo afetado
- `src/pages/OrderDetailPage.tsx` (linha 154)
