# Corrigir fotos no PDF de etiquetas

## Diagnóstico confirmado

Os pedidos selecionados estão corretamente vinculados aos produtos e esses produtos possuem `foto_url`. As fotos estão salvas como links de visualização do Google Drive (`drive.google.com/file/.../view`), mas o gerador tenta baixar esses links diretamente. O Drive devolve uma página HTML, não a imagem; a conversão falha silenciosamente e o PDF é salvo apenas com a grade e os textos.

## Correção

- Normalizar links do Google Drive para a URL direta de imagem já usada na página Estoque antes de fazer o download.
- Validar o tipo do conteúdo recebido para não tentar processar HTML como imagem.
- Manter a conversão para JPEG com fundo branco, proporção correta e cache para produtos da mesma grade.
- Se a URL direta não carregar, tentar uma segunda estratégia compatível com imagens do Drive.
- Não salvar o PDF silenciosamente quando nenhuma foto conseguir carregar: mostrar um erro claro com a quantidade de fotos que falharam.
- Preservar o layout A4 atual com divisórias, 4 colunas e 5 linhas.

## Validação

- Gerar novamente etiquetas com pedidos de estoque que possuem fotos do Google Drive.
- Renderizar o PDF em imagem e conferir visualmente fotos, grade, nomes e tamanhos.
- Verificar também pedidos repetidos da mesma grade para confirmar o reaproveitamento da foto.

Sem alteração no banco de dados.