# Reorganização da ficha adesiva 10 × 15 cm

## Cabeçalho em duas colunas
- Remover **7ESTRIVOS** do topo.
- Montar duas colunas alinhadas pela mesma altura, com margens e largura própria para impedir colisões:
  - coluna 1: **Código**, **Data**, **Tamanho**;
  - coluna 2: **Vendedor**, **Cliente**, **Modelo**.
- Manter cada par na mesma linha visual e calcular a altura de cada linha pela maior quebra entre as duas colunas; textos longos descem dentro da própria coluna, sem invadir a coluna vizinha.
- Aumentar a fonte geral da ficha, reduzindo-a de forma controlada somente quando necessário para preservar todo o conteúdo.

## Informações da ficha
- Usar apenas uma linha entre o cabeçalho e a primeira categoria, eliminando a linha duplicada e corrigindo o espaço entre título e conteúdo.
- Aproveitar toda a largura para as informações, começando no alto após o cabeçalho; quando o volume exigir, continuar em uma segunda coluna sem sobreposição.
- Manter os textos completos, sem reticências, com medição e quebra automática.

## QR, canhoto e rodapé
- Mover o QR code para o canto inferior esquerdo da área principal, imediatamente acima da linha pontilhada do canhoto.
- Reservar espaço próprio para o QR, sem encobrir as categorias nem as informações da sola.
- Manter o canhoto abaixo da linha pontilhada, com código de barras, número do pedido e informações da sola organizados dentro das margens.
- Colocar **7ESTRIVOS** abaixo do número do pedido/código de barras, como assinatura leve e pequena, no mesmo tamanho da numeração de páginas.
- Preservar a numeração de páginas no canto inferior direito.

## Validação
- Gerar amostras de bota e cinto em 100 × 150 mm, incluindo vendedor, cliente e modelo longos e conteúdo suficiente para ocupar duas colunas.
- Renderizar todas as páginas em imagem e conferir alinhamento das três linhas do cabeçalho, fonte maior, linha divisória única, fluxo em duas colunas, QR acima do pontilhado, canhoto e assinatura.
- Confirmar ausência de textos sobrepostos, cortados ou com reticências e verificar que a ficha A5 continua inalterada.

## Detalhes técnicos
- Alterar somente o gerador da ficha adesiva em `src/lib/fichaAdesivaPdf.ts`.
- Tornar cabeçalho, corpo, QR e canhoto áreas medidas separadamente, com posições verticais calculadas pelo conteúdo.
