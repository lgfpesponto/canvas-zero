## Objetivo
Fazer o comprovante que hoje aparece como **R$ 11,92** passar a aparecer como **R$ 11.923,80**, conforme informado na observação do próprio registro, e evitar que a tela continue sem opção de correção antes da confirmação.

## O que foi verificado
- O comprovante está salvo no banco em `revendedor_comprovantes` com `valor = 11.92`.
- A observação do mesmo registro diz: `O VALOR CERTO R$ 11.923,80`.
- A lista de pendentes (`ComprovantesRevendedorPendentes`) apenas exibe o valor salvo; por isso a visualização ainda não mudou.
- Já existe edição de valor na lista geral por vendedor (`ComprovantesPorRevendedor`), mas não existe edição direta na lista de comprovantes pendentes antes de confirmar.

## Plano de correção
1. **Corrigir o registro específico no banco**
   - Atualizar o comprovante pendente de Maria Gabriela, criado hoje às 10:48:43, de `11.92` para `11923.80`.
   - Manter status, vendedor, anexo e demais dados iguais.

2. **Adicionar correção de valor na visualização de pendentes**
   - Incluir um botão de editar valor ao lado do valor na tabela de comprovantes pendentes.
   - Abrir um pequeno diálogo com campo numérico para corrigir o valor antes de clicar em **Confirmar**.
   - Depois de salvar, recarregar a lista para a visualização mostrar o novo valor imediatamente.

3. **Melhorar leitura de formato brasileiro no envio**
   - No `EnviarComprovanteDialog`, normalizar valores digitados/retornados em formato brasileiro quando necessário.
   - Exemplo: `11.923,80` deve virar `11923.80`, não `11.92`.

4. **Validação**
   - Conferir no banco que o registro específico ficou com `11923.80`.
   - Conferir que a tabela de pendentes passa a exibir o valor corrigido.