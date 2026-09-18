# Ajustes da ficha adesiva 10 × 15 cm

## Cabeçalho
- Manter **7ESTRIVOS**, código, vendedor e data no topo, reservando uma coluna exclusiva para o QR code.
- Levar **Cliente** para o cabeçalho, antes de tamanho e modelo.
- Colocar **Tamanho** e **Modelo** antes da linha divisória, em duas colunas dentro da área livre à esquerda do QR code.
- Permitir que modelo longo quebre para a linha seguinte dentro da própria coluna, sem invadir o QR code e sem usar reticências.
- Calcular a altura do cabeçalho conforme as quebras necessárias, iniciando as categorias somente depois da linha divisória.

## Informações da ficha
- Manter Observação, Pesponto e Metais quando houver.
- Exibir a categoria **EXTRAS** seguindo a ficha de produção atual: acessórios, tricê, tiras, franja, corrente, costura atrás e carimbo.
- Substituir os fundos cinza das categorias por títulos em negrito com linhas divisórias, adequados à impressão térmica.
- Medir cada bloco antes de desenhá-lo e quebrar textos completos em novas linhas, garantindo espaço entre título e conteúdo e evitando qualquer sobreposição.
- Remover completamente o uso de reticências; quando necessário, reduzir a fonte dentro de um limite legível e continuar o conteúdo nas linhas seguintes.

## Canhoto inferior
- Remover o título **CANHOTO MONTAGEM** e o número que hoje aparece ao lado dele.
- Manter o código de barras e imprimir abaixo somente o número do pedido, sem o texto “CÓDIGO”.
- Nas informações da sola, remover os rótulos “TAM”, “SOLA” e “BICO” e mostrar diretamente, com quebra de linha conforme a largura:
  1. tamanho, tipo de sola e cor;
  2. formato do bico e vira, somente quando a vira for rosa ou preta;
  3. **FORMA:** e seu número.
- Reutilizar as abreviações da ficha A5: **Couro Reta → COURO**, **Pintada de Preto → P. PRETA** e substituir “Fino” por **BF** no formato do bico.
- Preservar margens e conteúdo completo; nenhuma informação do canhoto será cortada com três pontos.
- Para cintos, manter o canhoto simplificado com tamanho e produto, aplicando as mesmas regras de margem e quebra.

## Validação
- Gerar amostras 100 × 150 mm com modelo, cliente, observação e extras longos, além de diferentes combinações de sola.
- Renderizar botas e cintos em imagem e conferir: QR isolado, cabeçalho sem colisões, categorias sem sobreposição, ausência total de reticências, abreviações corretas e canhoto dentro das margens.
- Confirmar que a ficha A5 existente continua inalterada e verificar a compilação da aplicação.

## Detalhes técnicos
- Alterar somente o gerador da ficha adesiva em `src/lib/fichaAdesivaPdf.ts`.
- Trocar o corte atual de texto por um ajuste que combine quebra de linha e redução controlada de fonte.
- Tornar as posições verticais dinâmicas para acomodar cabeçalho e categorias sem desenhar um bloco por cima do seguinte.
