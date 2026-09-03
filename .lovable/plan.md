# Travar preço em pedidos Conferido, Cobrado e Pago

## Situação atual (verificada)

A mudança recente na composição **não altera o total** de nenhum pedido. Em `src/lib/estoqueOrderComposition.ts` a composição é ancorada no valor já salvo do pedido: soma-se as linhas, compara-se com o valor salvo e a diferença vira a linha "Acréscimo / arredondamento" ou "Desconto aplicado". Resultado: soma das linhas + resíduo = valor cobrado, sempre. Nada foi gravado no banco.

O que não existe hoje é uma **trava** que impeça, no futuro, qualquer outra alteração de preço em pedidos já finalizados.

## O que fazer

### 1. Trava no banco
Criar um gatilho na tabela de pedidos que bloqueie alteração de `preco`, `quantidade`, `desconto`, `adicional_valor` e `desconto_aplicado` quando o pedido estiver em Conferido, Cobrado ou Pago.

- Bloqueio com mensagem clara em português ("Pedido já conferido/cobrado/pago — o valor não pode ser alterado").
- Exceção única: `admin_master`, para casos de correção manual legítima.
- Mudança de progresso continua livre (a trava olha só os campos de valor).

### 2. Aviso na interface
No detalhe do pedido, quando o progresso for um dos três finais, os campos de valor ficam somente-leitura para quem não é `admin_master`, com um selo "Valor travado".

### 3. Auditoria de conferência
Rodar uma verificação de leitura comparando, para os pedidos nesses três progressos, o valor salvo com a soma da composição exibida — confirmando que fecham em 100% dos casos e que a mudança de exibição não gerou divergência.

## Detalhes técnicos

- Migração: função `public.bloquear_alteracao_preco_pedido_final()` + trigger `BEFORE UPDATE` em `public.orders`, comparando `OLD.status` com a lista de status finais e os campos monetários entre `OLD` e `NEW`; libera quando `public.has_role(auth.uid(), 'admin_master')`.
- Frontend: `src/pages/OrderDetailPage.tsx` — desabilitar edição dos campos de valor conforme status + role.
- Nenhum valor existente será recalculado ou reescrito.
