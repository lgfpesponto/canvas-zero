# Reforço visual da ficha adesiva 10 × 15 cm

## Ajustes
- Mover o QR code para o lado direito da ficha, imediatamente acima da área que contém as informações da sola, sem cruzar a linha pontilhada do canhoto.
- Aplicar negrito em todos os textos da ficha para melhorar a leitura na impressora térmica, inclusive conteúdo, número do pedido, assinatura **7ESTRIVOS** e numeração das páginas.
- Aumentar a fonte das informações de produção, como Observação, Pesponto, Acessórios, Metais e Extras, preservando títulos, margens e espaçamento.
- Aumentar também a fonte das informações do canhoto e manter a quebra automática em novas linhas quando o texto exceder a largura disponível, sem cortes nem reticências.
- Posicionar **7ESTRIVOS** rente à margem inferior esquerda, alinhado na mesma altura visual da numeração de páginas no canto direito.

## Validação
- Gerar amostras de bota e cinto em 100 × 150 mm, incluindo textos e informações de sola longos.
- Renderizar todas as páginas e conferir visualmente: QR à direita, textos em negrito, fontes maiores, quebras corretas, margens preservadas e rodapé alinhado.
- Confirmar que não há sobreposição, corte ou reticências e que a ficha A5 permanece inalterada.

## Detalhes técnicos
- Alterar somente o gerador da ficha adesiva em `src/lib/fichaAdesivaPdf.ts`.
- Recalcular o espaço do corpo e do canhoto após ampliar as fontes, reduzindo o tamanho apenas de forma controlada quando for indispensável para manter todo o conteúdo.