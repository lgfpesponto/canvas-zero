# Foto voltar a acompanhar a rolagem + menu mais estreito

## 1. Foto do pedido volta a descer com a página

A foto parou de acompanhar a rolagem porque ela ganhou um invólucro extra na coluna da direita: esse invólucro tem a altura exata da foto, então o comportamento "grudar no topo ao rolar" não tem espaço para agir. O invólucro sai (a coluna já tem a largura certa) e a foto volta a acompanhar a rolagem como antes.

## 2. Menu da esquerda mais estreito

O menu fixo da lateral esquerda fica mais estreito (de ~176px para ~144px), com texto e espaçamentos um pouco menores, para sobrar folga entre ele e a ficha e não dar sensação de estar por cima.

## Detalhes técnicos

- `src/pages/OrderPage.tsx`: remover o `<div className="w-full lg:w-[400px] shrink-0">` em volta de `FotoPedidoSidePanel`, deixando o `<aside lg:sticky>` como filho direto do grid.
- `src/components/ficha/FichaCategoriaMenu.tsx`: variante desktop passa de `w-44` para `w-36`; itens com padding horizontal menor.
- Nenhuma mudança em navegação por Enter, validações ou preços.
