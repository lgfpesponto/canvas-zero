# Ficha de produção adesiva 10 × 15 cm

## Objetivo
Criar uma segunda ficha de produção, própria para impressora térmica, sem alterar a ficha A5 atual.

## Como ficará
- PDF vertical com página exata de **10 cm de largura × 15 cm de altura**.
- Uma ficha por página, em preto e branco e com o mesmo estilo visual da ficha atual, reorganizado para leitura rápida.
- Gerada somente para pedidos de **bota e cinto**; outros produtos selecionados serão ignorados e o aviso de impressão mostrará quantas fichas válidas serão geradas.
- Conteúdo resumido:
  - 7ESTRIVOS
  - código do pedido
  - vendedor
  - data
  - tamanho
  - modelo/produto
  - QR code da foto de referência, quando existir
  - observação
  - cliente
  - pesponto
  - acessórios
  - metais
  - canhoto de montagem na parte inferior
- Para botas, o canhoto mostrará as informações disponíveis de sola (tamanho, solado, cor, bico, vira e forma), além do código de barras com o número do pedido acima.
- Para cintos, os campos sem equivalente — como sola, pesponto e metais — serão omitidos, preservando tamanho, produto e demais informações existentes.
- Textos longos terão quebra e ajuste de tamanho para não ultrapassar a etiqueta.

## Alteração em “Meus Pedidos”
- Substituir o botão único atual por duas ações lado a lado:
  - **Imprimir ficha** — mantém exatamente o PDF A5 atual.
  - **Imprimir ficha adesiva** — gera o novo PDF térmico 10 × 15 cm.
- As duas ações continuarão usando os pedidos marcados; quando não houver marcação, seguirão os filtros aplicados, como acontece hoje.
- A ficha adesiva terá confirmação própria, carregamento e registro no histórico de impressões.

## Implementação técnica
- Adicionar um gerador de PDF separado para não interferir no formato A5 existente.
- Reutilizar as regras atuais de código de barras, QR da foto, abreviações da sola e dados já carregados dos pedidos.
- Filtrar bota e cinto antes da geração e salvar o arquivo com nome distinto, como `Fichas Adesivas - data - hora.pdf`.
- Integrar a nova ação ao fluxo existente de seleção, filtros e confirmação da página de pedidos.

## Validação
- Verificar compilação e erros da aplicação.
- Gerar exemplos de bota e cinto em 100 × 150 mm.
- Renderizar o PDF em imagem e conferir visualmente margens, legibilidade, quebras, QR code, código de barras e ausência de cortes ou sobreposições.
- Confirmar que a ficha A5 atual permanece inalterada.
