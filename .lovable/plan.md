## Objetivo

Destravar a baixa de bordado dos **83 pedidos legados** que ainda estão com status antigo `Bordado` ou `Bordado 7Estrivos` — esses status não são aceitos pela RPC `bordado_baixar_pedido`, por isso a Mariana não consegue dar baixa neles pelo portal.

Os 6 pedidos que foram para "Aguardando" hoje **ficam como estão** (decisão do usuário). A questão da data retroativa de baixa fica para uma próxima rodada.

## O que muda

**Migration de dados (UPDATE):** para cada pedido com `status IN ('Bordado', 'Bordado 7Estrivos')`:

1. Atualiza `status = 'Entrada Bordado 7Estrivos'`.
2. Anexa uma entrada no `historico` registrando a normalização:
   - `local = 'Entrada Bordado 7Estrivos'`
   - `data = data atual` (a normalização acontece hoje, mas a data ORIGINAL do bordado já está preservada no histórico anterior do pedido)
   - `descricao = 'Migração automática: status legado "Bordado 7Estrivos" normalizado para "Entrada Bordado 7Estrivos"'`
   - `usuario = 'Sistema'`

Resultado: os 83 viram "Entrada Bordado 7Estrivos" e a Mariana passa a conseguir bipar/dar baixa pelo portal normalmente. Nenhum valor, vendedor, cliente ou outro campo é tocado.

## O que NÃO muda

- Código da aplicação: nada.
- RPC `bordado_baixar_pedido`: nada.
- Os 6 pedidos do "Aguardando": ficam como estão.
- Comissão, RLS, notificações, fluxo de pesponto: tudo intacto.
- Histórico antigo dos 83 pedidos: preservado integralmente; a entrada de migração é só **adicionada** no fim.

## Aviso sobre a comissão de bordado

Como a Mariana vai dar baixa nesses 83 pedidos hoje (ou nos próximos dias) pelo portal, a entrada `Baixa Bordado 7Estrivos` no histórico deles vai ficar com a data de hoje — então eles vão entrar na comissão de bordado de hoje, não do dia em que foram bordados de verdade. Isso é consequência conhecida e você decidiu resolver depois (etapa de baixa retroativa fica para outra rodada).

## Arquivos / objetos afetados

```
Migration única (dados): UPDATE em ~83 orders + append no campo historico
```

Confirmando, eu rodo a migration.