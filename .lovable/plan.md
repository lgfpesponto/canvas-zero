# Espelhar comprovantes do "A Receber" no Saldo do Vendedor

## Diagnóstico

A aba **Saldo do Vendedor** lê só de `revendedor_comprovantes` (envios feitos pelo vendedor). Os 50 comprovantes que o admin master lança no **A Receber** ficam só em `financeiro_a_receber` e nunca aparecem no Saldo. Por isso a lista vem vazia mesmo trocando o filtro Período para "Todos".

## Solução

Espelhar **automaticamente** os lançamentos do A Receber para o sistema de Saldo, criando: comprovante já aprovado em `revendedor_comprovantes` + entrada de saldo em `revendedor_saldo_movimentos` + tentativa de baixa automática de pedidos cobrados.

### 1. Trigger no banco (`financeiro_a_receber`)

Criar um trigger `AFTER INSERT` que, quando o admin lança um recebimento:
- Insere automaticamente em `revendedor_comprovantes` com `status = 'aprovado'`, `aprovado_por = created_by`, `aprovado_em = now()`, valor, data_pagamento, descrição, vendedor e URL do comprovante (chave de deduplicação: `comprovante_hash + vendedor`).
- Cria movimento `entrada_comprovante` em `revendedor_saldo_movimentos`.
- Chama `tentar_baixa_automatica(vendedor)` para quitar pedidos cobrados pendentes.

Também criar trigger `AFTER DELETE` que reverte: estorna o movimento de saldo e remove o comprovante espelhado (só se ainda não houver baixas vinculadas; se houver, cria movimento de estorno).

### 2. Migrar os 50 lançamentos existentes

Backfill em uma migration: para cada linha em `financeiro_a_receber` que ainda não tem espelho em `revendedor_comprovantes` (mesmo `comprovante_hash + vendedor`), criar o espelho como aprovado e o movimento de entrada. Em seguida, rodar `tentar_baixa_automatica` para cada vendedor afetado uma vez.

### 3. UI

Sem mudanças. A lista de comprovantes do Saldo do Vendedor passa a mostrar tanto:
- Os enviados pelo vendedor (status: pendente / aprovado / reprovado / utilizado).
- Os lançados pelo admin no A Receber (espelhados como **Aprovado**).

A descrição/observação do comprovante espelhado fica como `[Lançado em A Receber] <descrição original>` para o admin distinguir a origem.

## Detalhes técnicos

- Função `espelhar_a_receber_em_saldo()` `SECURITY DEFINER` chamada pelos triggers.
- Deduplicação por `(vendedor, comprovante_hash)` quando hash existir; sem hash, usar `(vendedor, data_pagamento, valor, comprovante_url)`.
- A baixa automática usa a função existente `tentar_baixa_automatica(vendedor, admin_id)`.
- O backfill cria os movimentos com `created_by = financeiro_a_receber.created_by` quando disponível.
- Sem impacto em RLS — triggers rodam como definer; tabelas mantêm políticas atuais.

## Sem mudanças

- Banco: nenhum schema alterado, apenas funções e triggers novos.
- A Receber continua funcionando como hoje; o espelho é transparente.
