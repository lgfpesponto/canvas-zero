## Problema

Card do Rafael Silva ainda mostra:
- Disponível: **−R$ 4.959,86**
- Pendente (113 pedidos Cobrados): **R$ 34.505,20**
- Falta total: **R$ 39.465,06** ✓ (esse já bate com a planilha)

O total "Falta" já está correto, mas ele está fatiado errado: R$ 4.959,86 estão "no disponível negativo" em vez de estarem como pedido pendente. Isso acontece porque nos últimos dias baixas automáticas consumiram pedidos além do que os comprovantes cobriam (saldo ficou negativo).

## Objetivo

Deixar **disponível = R$ 0,00** e **pendente = R$ 39.465,06**, sem mexer nos comprovantes aprovados nem nos valores dos pedidos.

## Como corrigir

Reverter (estornar) baixas recentes do Rafael até somar exatamente **R$ 4.959,86**. Cada estorno:
- Devolve o valor ao saldo disponível (−4.959,86 → 0)
- Volta o pedido de "Pago" para "Cobrado" (pendente 34.505,20 → 39.465,06)

Uma única operação resolve as duas pontas.

### Seleção dos pedidos a estornar

Vou escolher as baixas mais recentes (feitas hoje 24/07 10:53, que foram justamente as que empurraram o saldo para negativo) até fechar R$ 4.959,86. Se o subconjunto não fechar exato no centavo, o último estorno vira parcial via `ajustar_saldo_revendedor` para acertar a diferença de centavos.

Antes de executar vou listar aqui os N° de pedido escolhidos e o total, para você conferir. Nenhuma alteração é feita sem essa conferência.

## Escopo

- Apenas Rafael Silva. Maria Gabriela já está correta e não será tocada.
- Nenhuma mudança de UI/código — só ajuste de dados via SQL nas tabelas `revendedor_baixas_pedido`, `revendedor_saldo_movimentos` e `orders` (voltando status Pago → Cobrado dos pedidos escolhidos).
- Registrado em `revendedor_saldo_movimentos` como estorno com descrição "Reconciliação saldo Rafael — ajuste para bater com planilha (R$ 39.465,06)".

## Resultado esperado

```
Recebido:    R$ 464.621,21  (inalterado)
Utilizado:   R$ 481.673,58  (era 486.633,44, cai 4.959,86)
Disponível:  R$      0,00
Pendente:    R$  39.465,06  (era 34.505,20, sobe 4.959,86)
Falta:       R$  39.465,06
```
