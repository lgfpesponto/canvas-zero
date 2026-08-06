# Corrigir "Pago para" lido invertido no comprovante

## Problema

No comprovante Pix do Mercado Pago do vendedor Samuel, o bloco "Origem e destino" lista primeiro a **origem** (43.748.766 Laura Carrijo Felizardo Placido / Mercado Pago) e depois o **destino** (Juliana Cristina Ribeiro / Bradesco). A leitura automática gravou a origem como "Pago para", então o comprovante ficou como pago para Laura quando na verdade foi pago para Juliana.

A instrução atual de leitura só diz "nome de quem RECEBEU", sem explicar como interpretar layouts com origem e destino na mesma seção — por isso a IA pegou o primeiro nome da lista.

## O que muda

1. **Leitura corrigida**: a instrução passa a explicar explicitamente o padrão "Origem e destino" (Mercado Pago, Nubank, PicPay, Inter e similares): o primeiro bloco é quem PAGOU e o segundo é quem RECEBEU. Também passa a reconhecer rótulos como "de/para", "pagador/recebedor", "debitado de", "creditado para" e a ignorar o titular da conta de origem, mesmo quando aparece em destaque no topo.
2. **Coerência com o vendedor**: se o nome extraído como destinatário for igual ao titular da conta de origem, o campo fica marcado como não identificado em vez de gravar o pagador errado.
3. **Correção manual**: no painel de comprovantes pendentes, além do lápis que já edita o valor, passa a existir edição do campo "Pago para" (nome e CPF/CNPJ), para o admin master ajustar leituras erradas antes de confirmar.
4. **Correção do registro atual**: o comprovante do Samuel (R$ 7.724,40, 04/08/2026) será atualizado para "Juliana Cristina Ribeiro", com tipo recalculado.

## Detalhes técnicos

- `supabase/functions/extract-comprovante/index.ts`: reforçar o system prompt com regras de origem x destino; adicionar ao tool call os campos `origem_nome` / `origem_documento` e descartar `destinatario_*` quando coincidir com a origem.
- `src/components/financeiro/saldo/ComprovantesRevendedorPendentes.tsx`: novo diálogo de edição de `pagador_nome` / `pagador_documento`, reaproveitando o padrão do diálogo de valor.
- Atualização de dados no comprovante existente do Samuel via update na tabela `revendedor_comprovantes`.
