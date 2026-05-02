## Ajuste solicitado
Mostrar o número real do pedido na coluna "Pedido" dentro do drawer de saldo do vendedor (admin master), no lugar do ID cortado (`1ce1ffed…`).

## O que vou alterar

### 1. Corrigir a seção "Baixas realizadas"
No arquivo `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`, a coluna "Pedido" da tabela de baixas hoje renderiza:

```tsx
{b.order_id.slice(0, 8)}…
```

Vou trocar isso para usar o mesmo mapa `orderNumeros` que já está sendo carregado no `reload()`.

Novo comportamento:
- se existir número mapeado para `b.order_id`, mostrar `Pedido #NUMERO`
- o texto será clicável e levará para `/pedido/{order_id}`
- se por algum motivo o número não vier, aí sim manter um fallback seguro

### 2. Manter consistência com o extrato
O extrato completo já tenta mostrar `Pedido #...` quando encontra `order_id`. Vou reaproveitar a mesma lógica visual para a tabela de "Baixas realizadas", para ficar padronizado.

### 3. Validar a origem dos números
O componente já busca os números dos pedidos via:
- `fetchPedidosCobrados(vendedor)`
- consulta extra em `orders` para IDs faltantes

Então não precisa mexer no banco. O problema é só de renderização da coluna "Pedido" na lista de baixas.

## Resultado esperado
Na aba de detalhes do saldo do vendedor, em "Baixas realizadas", a coluna "Pedido" deixará de mostrar o UUID cortado e passará a mostrar algo como:
- `Pedido #95928488`
- clicável para abrir o pedido

## Arquivo a editar
- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`

## Observação técnica
Se eu identificar que o `orderNumeros` não está cobrindo todas as baixas antigas, também amplio a coleta dos IDs usados em `baixas` na montagem do mapa, não só dos movimentos. Isso garante que pedidos antigos já baixados também apareçam com o número correto.