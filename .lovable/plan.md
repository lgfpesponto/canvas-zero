## Problema

O vendedor Rafael Silva enviou 2 comprovantes idênticos de **R$ 4.500** (mesmo valor, mesma data 23/07, mesmo pagador "OLIVEIRA PESPONTO"). O sistema aceitou e aprovou os dois porque a checagem de duplicidade em `EnviarComprovanteDialog.tsx` só valida **hash do arquivo** — como o revendedor tirou uma foto nova do mesmo comprovante, o hash difere e passou.

O comprovante duplicado é `a9c78330-b94e-4dc0-9de6-ee34d33f2ab2` (criado hoje 24/07 14:10, aprovado 14:11). O original é `11ea696b...` (23/07 18:06).

## O que fazer

### 1. Corrigir o saldo do Rafael Silva (SQL admin)
- Reverter as baixas automáticas que foram geradas pela aprovação do comprovante duplicado (movimentos criados após 24/07 14:11): voltar os pedidos afetados de `Pago` → `Cobrado` e apagar os registros de `revendedor_baixas_pedido` correspondentes.
- Apagar o movimento `entrada_comprovante` de R$ 4.500 do comprovante duplicado.
- Apagar o registro `a9c78330...` de `revendedor_comprovantes` (e o arquivo do Storage).
- Recalcular: o saldo disponível deve voltar a **R$ 0,00** e a pendência total voltar aos **R$ 39.465,06** reais.

### 2. Criar a regra de bloqueio (código)
Editar `src/components/financeiro/saldo/EnviarComprovanteDialog.tsx` para, antes de subir cada comprovante, checar no banco se já existe algum registro do **mesmo vendedor** com **mesmo valor + mesma data_pagamento + mesmo pagador_nome** (case-insensitive/trim). Se encontrar, **bloquear o envio** com mensagem clara ("Já existe um comprovante idêntico enviado em DD/MM — valor, data e pagador coincidem"), independentemente do status (pendente / aprovado / reprovado).

A checagem por hash de arquivo continua como fallback adicional.

### 3. Reforçar no lado do admin (opcional, mesma edição)
No `ComprovantesRevendedorPendentes.tsx`, ao aprovar um pendente, rodar a mesma checagem tripla contra os **aprovados** do vendedor e avisar antes de confirmar, caso um duplicado tenha escapado.

## Detalhes técnicos

- **Chave de duplicidade**: `vendedor` + `valor` (numeric equal) + `data_pagamento` (date equal) + `LOWER(TRIM(pagador_nome))` equal. Quando `pagador_nome` está vazio nos dois lados, tratar como coincidência também (regravação da mesma transferência sem nome do pagador extraído).
- **Query única antes do upload** por item — retorna id + status + created_at do match; se houver, aborta esse item e mostra toast destrutivo com a data do comprovante existente.
- **Reversão do Rafael**: identificar `revendedor_saldo_movimentos` com `comprovante_id = 'a9c78330...'` (entrada) e todas as `baixa_pedido` criadas na sequência (created_at ≥ 14:11 hoje até esgotar o valor), reverter em ordem, voltar `orders.status` para `Cobrado`, apagar entradas em `revendedor_baixas_pedido`, apagar os movimentos, apagar o comprovante e o arquivo.
