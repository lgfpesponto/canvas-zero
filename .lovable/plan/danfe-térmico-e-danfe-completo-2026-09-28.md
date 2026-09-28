# DANFE térmico e DANFE completo

## Resultado
- Criar dois formatos de impressão para NF-e autorizada: **DANFE simplificado em etiqueta de 100 × 150 mm**, exatamente o tamanho da ficha adesiva que o sistema já imprime, e **DANFE completo em A4**.
- Reproduzir a sequência dos blocos, hierarquia, tabelas e tamanhos de letra dos exemplos enviados, adaptando o conteúdo aos dados reais de cada nota. Na etiqueta, preservar os 100 × 150 mm fixos; quando o conteúdo exceder a área útil, continuar em outra etiqueta sem cortar informações.
- Disponibilizar na nota autorizada as ações “Imprimir DANFE simplificado (etiqueta)”, “Imprimir DANFE” e “Baixar PDF”. Em homologação, incluir aviso evidente “SEM VALOR FISCAL”.

## Dados e apresentação
- Usar a chave de acesso, protocolo, itens, totais, emitente e destinatário da própria NF-e autorizada, prioritariamente do XML autorizado, sem inventar dados ausentes nem reutilizar valores ilustrativos dos anexos. O código impresso de cada item será seu SKU, não o texto “CFOP5101”.
- Permitir enviar o logo do emitente nas configurações NF-e; aplicá-lo nos dois formatos e convertê-lo para preto e branco puro na etiqueta. Caso não haja logo, manter o alinhamento sem imagem fictícia.
- Organizar as informações adicionais e o total aproximado de tributos conforme os percentuais federal e estadual configurados por NCM; na ausência desses dados, exigir configuração antes de apresentar percentuais, sem copiar os do exemplo.
- Ajustar os padrões de CFOP de venda de produção própria para 5101/6101 (contribuintes) e 5107/6107 (não contribuintes), mantendo a escolha editável antes de emitir; não usar 5102/6102 como padrão. Dados de tributação de CINTO e EXTRAS permanecem a cargo do contador, sem preenchimento presumido.

## Detalhes técnicos e verificação
- Reutilizar o fluxo existente de NF-e e a biblioteca de PDF já usada na ficha adesiva; compartilhar extração/normalização fiscal entre os dois modelos, sem criar um segundo fluxo de emissão.
- Guardar apenas a referência do logo com acesso restrito às pessoas autorizadas a configurar NF-e; fazer as alterações de dados e permissões necessárias sem mexer em notas históricas.
- Conferir os dois PDFs renderizados contra os anexos, inclusive código de barras legível, quebras de página, descontos, notas com vários itens, impressão térmica 100 × 150 mm e formato A4. Validar que notas não autorizadas não liberam impressão e que homologação exibe o aviso.
