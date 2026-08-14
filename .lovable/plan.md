# Menu encostado na lateral e Atalhos em pop-up

## 1. Menu do desktop não pode espremer a ficha

Hoje o menu lateral fica na mesma linha da ficha, dividindo o espaço — por isso, quando a foto do pedido abre, a ficha fica mais estreita. O menu passa a ficar flutuando na área vazia à esquerda, fora do fluxo da ficha: a largura da ficha fica igual com ou sem foto aberta. Em telas estreitas demais para o espaço lateral, o menu simplesmente não aparece no desktop (continua disponível pelo botão no mobile).

## 2. Botão "Atalhos" no topo (desktop)

No desktop o botão "Atalhos" sai de baixo do menu e vai para a linha de botões do topo, na primeira posição: **Atalhos | Limpar | Criar Modelo | Modelos | Trocar para Cinto**.

## 3. Atalhos e Menu abrem em pop-up

- Clicar em "Atalhos" (desktop e mobile) abre uma janela centralizada por cima da tela com a lista de atalhos, sem empurrar o conteúdo para baixo.
- No mobile, "Menu" também abre em pop-up com as categorias; ao escolher uma categoria a janela fecha e a página rola até a seção.
- A ordem dos 6 botões do mobile continua a mesma.

## Detalhes técnicos

- `OrderPage.tsx`: o wrapper `flex gap-6` do menu + form deixa de ser flex; o `FichaCategoriaMenu` desktop vira `absolute right-full mr-4 top-0` dentro de um container `relative`, escondido abaixo de `xl` (`hidden xl:block`), para não consumir largura da ficha.
- Estados `atalhosAberto` / `menuAberto` passam a controlar dois `Dialog` (shadcn) renderizados uma vez, com `FichaAtalhosLista` e `FichaCategoriaMenu variant="inline"` dentro.
- Botão "Atalhos" adicionado ao bloco `hidden lg:flex` do cabeçalho, antes de `botaoLimpar`; removido o `children` do `FichaCategoriaMenu` desktop.
- Nenhuma mudança em navegação por Enter, validações ou preços.
