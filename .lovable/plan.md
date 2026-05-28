## Objetivo
Entregar um relatório (CSV + PDF) listando, dentro dos **1016 pedidos** do filtro atual (Maria Gabriela / Pago / Conferido=Sim), exatamente quais tiveram o preço alterado pelo destravamento — com o número do pedido, valor antigo, valor novo e a diferença.

## Problema atual
- O reconciliador rodou e atualizou `orders.preco`, mas não gravou o valor antigo em lugar nenhum.
- `preco_anterior` está NULL em todos os 1016 pedidos.
- O histórico `alteracoes` não recebeu entrada do reconciliador.
- Resultado: hoje não dá para reconstruir a lista de "o que mudou".

## Solução em 2 etapas

### Etapa 1 — Criar trilha de auditoria do reconciliador
Criar tabela `preco_reconciliacoes` para registrar, a cada execução, todo pedido cujo preço foi recalculado:

```
preco_reconciliacoes
- id, order_id, numero, vendedor
- preco_antes, preco_depois, delta_unit
- quantidade, delta_total
- composicao_snapshot (jsonb opcional)
- executado_em, executado_por
```

Ajustar `supabase/functions/reconciliar-precos/index.ts` para gravar uma linha aqui sempre que `preco_novo != preco_atual`.

### Etapa 2 — Rodar o reconciliador em modo "auditoria" sobre os 1016 pedidos
Disparar a edge function só nos pedidos do filtro (Maria Gabriela / Pago / Conferido=Sim). Como hoje todos já estão com o preço recalculado, vou rodar uma **segunda passada comparativa**: para cada pedido, recomputo a composição atual e comparo com o `preco` gravado — se houver delta, registro em `preco_reconciliacoes`.

Em paralelo, posso fazer um "replay histórico": pegar o `alteracoes[]` de cada pedido e, quando houver entradas antigas com o preço daquela época, comparar com o preço atual. Isso me permite estimar quais pedidos provavelmente subiram com o destravamento. (Aproximado — só dá para confirmar 100% para alterações futuras.)

### Etapa 3 — Gerar o relatório
Com os dados em `preco_reconciliacoes`, gero dois arquivos em `/mnt/documents/`:
- `pedidos_alterados_maria_gabriela.csv` — colunas: número, data, modelo, qtd, valor antigo, valor novo, delta
- `pedidos_alterados_maria_gabriela.pdf` — mesmo conteúdo formatado A4, totais no rodapé

## Decisão necessária
O **valor antigo exato** dos pedidos do filtro **se perdeu** quando o reconciliador rodou sem auditoria. Tenho duas alternativas honestas:

1. **Reconstrução aproximada via histórico `alteracoes`** — funciona para os ~551 pedidos que têm histórico salvo; nos demais o "valor antigo" virá marcado como "desconhecido".
2. **Daqui pra frente** — implemento a auditoria e a partir da próxima alteração de tabela de preço, todo delta fica rastreado, com relatório fiel.

Recomendo fazer **as duas**: implementar a auditoria (etapa 1) para nunca mais perder essa informação, e entregar o relatório aproximado com a coluna "fonte do valor antigo" indicando se veio do histórico ou se é desconhecido.

## Arquivos que serão tocados
- `supabase/migrations/<novo>.sql` — criar `preco_reconciliacoes` + GRANTs + RLS (só admin_master)
- `supabase/functions/reconciliar-precos/index.ts` — gravar auditoria por pedido alterado
- script único em `/tmp` para varrer os 1016 pedidos, reconstruir o "valor antigo" a partir de `alteracoes[]` e gerar CSV/PDF em `/mnt/documents/`
