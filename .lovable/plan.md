## O que está acontecendo

Você tem 3 bugs conectados na tela de Solicitações de Ajuste e na FIFO de Cobrados:

1. **Erro "comprovante_notificacoes_tipo_check"** ao aprovar — o CHECK da tabela só aceita `aprovado`/`reprovado`, mas a função insere `ajuste_aprovado`/`ajuste_negado`.
2. **Gravatas mostrando R$ 0,00 na FIFO** — confirmei no banco que todas as gravatas da Maria Gabriela estão com `preco = 0` na tabela (e já marcadas como migradas). A lista FIFO lê `preco` cru, por isso fica zero. O detalhe e PDF mostram R$ 30 porque recomputam em runtime.
3. **Ajuste aprovado seria revertido** — mesmo se o erro acima não acontecesse, o aprovar não marca `preco_congelado = true`, então o recompute automático sobrescreveria o valor aprovado em poucos segundos.

## Correção (1 migration SQL, sem mudança de código)

```sql
-- 1) Permitir os novos tipos de notificação
ALTER TABLE public.comprovante_notificacoes
  DROP CONSTRAINT IF EXISTS comprovante_notificacoes_tipo_check;
ALTER TABLE public.comprovante_notificacoes
  ADD CONSTRAINT comprovante_notificacoes_tipo_check
  CHECK (tipo IN ('aprovado','reprovado','ajuste_aprovado','ajuste_negado'));

-- 2) Aprovar ajuste passa a CONGELAR o preço (não recalcula mais)
--    Atualiza decidir_ajuste_solicitacao para setar preco_congelado=true
--    no mesmo UPDATE de preco.

-- 3) One-off: corrigir as gravatas com preco=0 já no banco
--    Para tipo_extra IN ('gravata_pronta_entrega','gravata_country')
--    e preco = 0  →  preco = 30 * quantidade
--    (regra fixa confirmada por você)
UPDATE public.orders
   SET preco = 30 * GREATEST(quantidade,1)
 WHERE tipo_extra IN ('gravata_pronta_entrega','gravata_country')
   AND COALESCE(preco,0) = 0;
```

## O que vai mudar no comportamento

- Aprovar/Negar ajuste de valor: passa a funcionar, sem erro.
- Quando aprovado, o preço fica **congelado** naquele valor (não vai mais ser revertido pelo recálculo). Para mudar depois, só editando manualmente o pedido ou via novo ajuste retroativo.
- As gravatas da FIFO vão aparecer com R$ 30,00 cada (em vez de R$ 0,00). O saldo "Utilizado" do dashboard automaticamente vai refletir o valor real cobrado dessas gravatas.

## Resposta direta à sua pergunta

> "o que acontece quando aceita essa mudança de valor do pedido solicitada pelo vendedor?"

Hoje (com o bug): dá erro e nada salva.
Depois da correção: o `preco` do pedido vira o valor solicitado pelo vendedor, fica **congelado** (não será mais sobrescrito por recálculo), o histórico do pedido recebe um registro "Ajuste de valor aprovado: R$ X → R$ Y", a solicitação vira "aprovado" e o vendedor recebe notificação no sino.

## Não precisa mudar nada no código TypeScript

Apenas a migration acima. Confirma que pode aplicar?
