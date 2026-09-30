# Ajustar impressão da NF-e ao modelo enviado

## Resultado
- Refazer a DANFE A4 para reproduzir a organização visual do PDF enviado: canhoto, emitente, identificação DANFE, código de barras, destinatário, faturas, impostos, transporte, itens e dados adicionais.
- Manter a etiqueta térmica como formato separado e preservar a impressão somente para notas autorizadas.

## Implementação
- Corrigir proporções, colunas, títulos, bordas, tipografia e espaços da folha A4.
- Exibir as colunas fiscais completas dos itens e aproveitar os dados reais disponíveis, sem inventar informações ausentes.
- Garantir paginação segura quando houver muitos itens.
- Conferir visualmente o PDF gerado e validar a impressão no sistema.

## Limites
- Não alterar emissão, autorização, valores ou regras fiscais da nota.
- Não copiar dados específicos do PDF de exemplo; ele será usado apenas como padrão visual.
