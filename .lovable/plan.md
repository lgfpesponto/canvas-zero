# Metais "Não tem", menu flutuante e ficha centralizada

## 1. Metais: "Não tem" no lugar certo

- Remover a opção "Não tem" de **Tipo do Metal** (volta a ser só "Rebite" + variações cadastradas).
- Adicionar **"Não tem"** como variação de **Área do Metal** (preço R$ 0), junto de "Inteira" e "Metade da Bota".
- Com "Não tem" selecionado na Área do Metal, Tipo e Cor do Metal deixam de ser obrigatórios e o Enter segue para o próximo campo.

## 2. Menu do desktop acompanha a rolagem

Hoje o menu fica parado no topo e some quando a página desce. Ele passa a "descer junto" com a rolagem, como o painel da foto: fica grudado na lateral esquerda enquanto a ficha rola.

## 3. Ficha centralizada quando a foto está aberta

Com a foto aberta sobra uma área vazia ao lado direito. O bloco ficha + foto passa a ser alinhado de forma que a ficha fique centralizada na tela, com o menu ocupando a folga da esquerda e a foto a folga da direita — a largura da ficha continua a mesma com ou sem foto.

## 4. Menu flutuante no mobile

No mobile o botão "Menu" também acompanha a rolagem: além do botão da grade no topo, um botão flutuante fixo no canto inferior da tela abre o pop-up do menu de categorias de qualquer ponto da página. O botão "Atalhos" continua só no topo.

## Detalhes técnicos

- `src/lib/orderFieldsConfig.ts`: `AREA_METAL` ganha `{ label: 'Não tem', preco: 0 }`; `TIPO_METAL` permanece `['Rebite']`.
- `src/pages/OrderPage.tsx`: remover o checkbox fixo "Não tem" do bloco Tipo do Metal (linhas ~2576-2590) e a lógica de exclusividade associada; ajustar as validações de metais em `handleSubmit` para não exigir tipo/cor quando `areaMetal === 'Não tem'`.
- Criar a variação "Não tem" de Área do Metal em `ficha_variacoes` (preço 0) via migração, com fallback no config.
- Layout: o wrapper `absolute right-full top-0` do menu desktop vira `absolute right-full top-0 h-full` para que o `sticky top-24` do `FichaCategoriaMenu` funcione; o grid do container passa a `lg:grid-cols-[minmax(0,1fr)_400px]` centralizado via `justify-center` com largura de ficha fixa, mantendo `max-w` constante entre os dois estados.
- Mobile: novo botão fixo (`fixed bottom-4 left-4 z-40 lg:hidden`) chamando `setMenuAberto(true)`, posicionado para não colidir com os botões flutuantes da foto.
- Nenhuma mudança em cálculo de preço, navegação por Enter ou demais validações.
