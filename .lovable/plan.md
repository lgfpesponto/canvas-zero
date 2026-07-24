## Diagnóstico já confirmado no banco

**Maria Gabriela**
- Pendência atual no portal (71 pedidos Cobrado): **R$ 24.867,40** (soma de `preco × quantidade`).
- Se somar apenas `preco` gravado: **R$ 24.247,40**.
- A diferença de **R$ 620,00** vem de UM pedido com `quantidade = 2` (`EST LARA PVC PRETA`, preço unitário R$ 620, total real R$ 1.240).
- Motivo do card mostrar "Falta R$ 24.532,20": a tela `FinanceiroSaldoRevendedor` está calculando `preco * quantidade` para "pendências", enquanto `orders.preco` já é o total final do pedido. Isso infla o valor.
- Além disso, existe um comprovante aprovado de **R$ 15.329,00** cujo movimento entrou como **R$ 15,329** — erro histórico real que precisa ser corrigido no saldo.
- Valor pendente correto informado pela usuária: **R$ 23.937,20**.

**Rafael Silva**
- 113 pedidos Cobrado sem baixa, total gravado em `preco`: **R$ 34.505,20** (sem distorção de quantidade nele).
- Saldo disponível: **R$ -4.994,86**.
- Falta atual no portal: R$ 34.505,20 + 4.994,86 = **R$ 39.500,06**.
- Valor pendente correto informado pela usuária: **R$ 39.465,06**.
- Diferença de **R$ 35,00** provavelmente vem de estornos automáticos de edição de pedidos.

## Causas reais do problema recorrente

1. **Cálculo de "pendências" na tela usa `preco * quantidade`** enquanto o restante do sistema trata `orders.preco` como total final. Único ponto que ainda usa a fórmula errada: `FinanceiroSaldoRevendedor.tsx` (`sum + (p.preco || 0) * (p.quantidade || 1)`).
2. **Bloqueio de comprovante duplicado é fraco**: só compara hash do arquivo. Fotos diferentes do mesmo comprovante passam.
3. **Erros pontuais em movimentos** (ex.: comprovante R$ 15.329 lançado como R$ 15,329) não têm alerta visível — só aparecem como "falta que não bate".

## Plano de correção

### 1. Corrigir o cálculo da tela (sem mexer em lógica de baixa)
- Em `FinanceiroSaldoRevendedor.tsx`, substituir `(p.preco || 0) * (p.quantidade || 1)` por `getOrderFinalValue(p)`.
- Card e drawer passam a mostrar exatamente o mesmo número.

### 2. Bloquear duplicidade de comprovante de verdade
- **Banco**: função de normalização de nome + trigger em `revendedor_comprovantes` impedindo insert/update com mesma combinação `vendedor + valor (2 casas) + data_pagamento + destinatário`. Reforço dentro de `aprovar_comprovante_revendedor`.
- **Frontend** (`EnviarComprovanteDialog.tsx`): antes do insert, consulta e bloqueia com mensagem clara. Também bloqueia duplicados dentro do mesmo lote.

### 3. Corrigir o movimento histórico de R$ 15.329 da Maria
- Ajustar o `valor` do movimento `entrada_comprovante` ligado ao comprovante `c296258b-…` de 15,329 para 15.329,00.
- Recalcular `saldo_anterior`/`saldo_posterior` dos movimentos posteriores dela em ordem cronológica, para manter o extrato consistente.
- Registrar auditoria via ajuste administrativo descritivo, sem apagar histórico.

### 4. Aba "Conferência" no drawer do revendedor (admin_master)
Mostra por vendedor:
- pendência calculada certa,
- baixas onde `valor_pedido` diverge do valor atual do pedido,
- comprovantes aprovados cujo movimento não bate com o valor do comprovante,
- pedidos com `quantidade > 1` (informativo).

### 5. Reconciliação para bater o valor real pedido

**Maria Gabriela → alvo R$ 23.937,20**
1. Depois de corrigir a tela e o movimento de R$ 15.329, recalcular:
   - pendência real = soma de `getOrderFinalValue(o)` dos 71 Cobrados = R$ 24.867,40.
   - Diferença para o alvo: **R$ 930,20**.
2. Antes de qualquer ajuste, listar os 71 pedidos (todos de 22/07 e 23/07 conforme escopo dela) para conferir centavo por centavo com a usuária. Só aplicar ajuste após ela apontar quais linhas explicam os R$ 930,20 (ex.: descontos aprovados que não foram aplicados, pedido cancelado, valor divergente).
3. Aplicar correção via um dos caminhos abaixo, o que a conferência indicar:
   - **Ajuste de preço no pedido específico** (via solicitação de ajuste aprovada + `recomputeOrderPrice`) quando a diferença for de valor de pedido;
   - **Baixa manual** de pedido que já foi pago fora do sistema (opção "Quitar como histórico" já existente);
   - **Ajuste administrativo de saldo** com descrição, só se sobrar diferença que não caiba nos dois anteriores.
4. Ao final, confirmar via query: soma dos Cobrados sem baixa da Maria = R$ 23.937,20.

**Rafael Silva → alvo R$ 39.465,06**
1. Escopo: apenas os dias da planilha enviada pela foto.
2. Listar os 113 pedidos Cobrado sem baixa dele + saldo (-R$ 4.994,86) e cruzar com a planilha.
3. Diferença atual entre portal e alvo: **R$ 35,00**. Confirmar com a usuária qual pedido/estorno explica esses R$ 35 antes de ajustar.
4. Aplicar correção pelo caminho apropriado (mesmas 3 opções acima).
5. Confirmar via query: (soma dos Cobrados sem baixa) − saldo disponível = R$ 39.465,06.

### 6. Validação final
- Reexecutar as queries de auditoria dos dois vendedores.
- Print/print interno mostrando: pendência exibida no card = pendência do drawer = valor real esperado.
- Registrar no memory que `orders.preco` é sempre total final e que qualquer soma de pendência deve usar `getOrderFinalValue`.

## Nota importante
Não vou aplicar nenhum ajuste de saldo ou baixa "no chute". Depois de corrigir os bugs (passos 1–3) e mostrar a lista detalhada dos pedidos (passo 4/5), preciso da sua confirmação por linha antes de mexer em dinheiro. Isso evita repetir o problema.