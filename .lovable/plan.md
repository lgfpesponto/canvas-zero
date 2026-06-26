## Mudança

Em `src/pages/RanchoChiquePedidosPage.tsx`, na linha do pedido (e também nos itens, dentro do expandido), quando a flag/status for `pedido_criado`, transformar o badge verde **PEDIDO CRIADO** em um botão clicável que navega para `/pedido/{order_id_portal}` (página de detalhe em Meus Pedidos — mesma rota já usada pelo botão "Ver pedido" do bloco expandido).

- Linha 469-479 (linha do pedido): adicionar um caso `p.flag === 'pedido_criado' && p.order_id_portal` que renderiza `<button onClick={(e) => { e.stopPropagation(); navigate(\`/pedido/${p.order_id_portal}\`); }}>` com o mesmo estilo verde do badge, evitando expandir o pedido ao clicar.
- Linhas 562-564 (badge de item): se `it.status === 'pedido_criado'` e o pedido tem `order_id_portal`, renderizar o badge como botão que faz `navigate(\`/pedido/${p.order_id_portal}\`)`.
- Fallback: se não houver `order_id_portal`, mantém o badge não-clicável (atual).
- Cursor `cursor-pointer` + `hover:bg-green-700` no botão.

Sem mudanças de banco, sem mudanças no fluxo Bagy.

## Fora de escopo

- Outras flags/badges.
- UI do dialog de gerar ficha.