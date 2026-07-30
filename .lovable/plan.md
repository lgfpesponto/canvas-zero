## Diagnóstico (verificado no banco)

Consultei os dados: os **196 produtos ativos** com SKU estão todos com `bagy_sync_status = 'ok'`, todos com `bagy_variation_id` e `bagy_sync_at` preenchidos, e a fila `bagy_stock_sync_queue` está com **0 pendentes**.

O que ainda aparece como "não sincronizado" são **7 produtos** vindos de linhas antigas da fila com `ultimo_erro = 'sku_nao_encontrado_na_bagy'` (Mulas Horse Nescau 40, West Preta e Branco 36, Nelore Crazy Horse Nescau 42 e 45, Arraia e Metais Dourados 40, Lara Horse Nescau 38, Destroyer Infantil 33). Em todos eles o erro é **anterior** ao último sync bem-sucedido do produto — ou seja, o SKU foi encontrado depois e já está sincronizado. O contador só não zera porque `fetchBagyProblemas` conta qualquer linha da fila com `ultimo_erro` preenchido, sem comparar com o `bagy_sync_at` do produto.

## Correção

1. **`src/components/estoque/BagySyncErrorsDialog.tsx`** — em `fetchBagyProblemas`, descartar erros da fila já superados: ignorar linha com `processado_em` preenchido quando o produto está com `bagy_sync_status = 'ok'` e `bagy_sync_at >= processado_em` (ou `criado_em` da linha). Assim só sobram erros realmente atuais, e o botão/contador some quando tudo está ok.
2. **Limpeza dos registros residuais** — zerar `ultimo_erro` das linhas da fila já processadas cujo produto sincronizou depois, para não poluir o histórico.
3. **Validação** — reconferir contagem: fila sem erros ativos, botão "Sincronizar com Bagy" e "Ver produtos" desaparecendo quando não há nada real pendente, e confirmar que um erro novo (ex.: SKU inexistente) continua aparecendo normalmente.

## Detalhe técnico
A comparação usa `processado_em`/`criado_em` da fila contra `bagy_sync_at` do produto; sem `processado_em` (linha pendente) o item continua listado como antes.
