## Objetivo
Resetar a aba "Saldo do Vendedor" para um marco zero hoje, mantendo apenas os recebidos atuais e zerando todos os utilizados:

- **Recebido (todos):** R$ 315.066,32 (Gabi 300.251,32 + Rafael 11.400 + Denise 3.415)
- **Utilizado (todos):** R$ 0
- **Saldo disponível total:** R$ 315.066,32 (= soma dos recebidos)
- A partir de hoje, novos pedidos `Cobrado` é que vão consumir saldo.

## Situação atual
- Gabi: recebido 300.251,32 / utilizado 81.251,67 / ajuste +36.848,15 / saldo 255.847,80.
- Existe 1 pedido `Cobrado` sem baixa de Gabi puxando o aviso "Faltam pedidos para dar baixa".

## Mudanças (banco apenas, em uma migração)

1. **Apagar o ajuste antigo da Gabi** (`ajuste_admin` de R$ 36.848,15) em `revendedor_saldo_movimentos` — esse valor estava inflando o saldo dela artificialmente.

2. **Zerar utilizado da Gabi:**
   - `UPDATE revendedor_baixas_pedido SET movimento_id = NULL WHERE vendedor='Maria Gabriela'` — preserva o vínculo "pedido já reconciliado" (não vai voltar para fila de auto-baixa) mas desliga do movimento.
   - `DELETE FROM revendedor_saldo_movimentos WHERE vendedor='Maria Gabriela' AND tipo='baixa_pedido'` — apaga as 49 saídas (R$ 81.251,67).

3. **Quitar historicamente o pedido Cobrado pendente da Gabi** (mesmo padrão usado para Rafael/Samuel/Larissa/Fabiana): inserir `revendedor_baixas_pedido` com `movimento_id=NULL` para que a auto-baixa não tente cobrar de novo.

4. **Triggers** `DISABLE TRIGGER USER` em `revendedor_baixas_pedido` e `revendedor_saldo_movimentos` durante a operação, reativando ao final.

## Resultado esperado em `vw_revendedor_saldo`

| Vendedor | Recebido | Utilizado | Saldo |
|---|---|---|---|
| Maria Gabriela | 300.251,32 | 0 | 300.251,32 |
| Rafael Silva | 11.400,00 | 0 | 11.400,00 |
| Denise Garcia Feliciano | 3.415,00 | 0 | 3.415,00 |
| **Total** | **315.066,32** | **0** | **315.066,32** |

Aviso "Faltam pedidos para dar baixa" deve sumir. Comprovantes pendentes continuam 0. Nenhuma mudança de código frontend — os cards já calculam a partir da view.

## Não muda
- Recebidos da Gabi (37 entradas de comprovante) ficam intactos.
- Histórico dos comprovantes aprovados continua igual.
- Lógica de baixa automática (ligada/desligada) continua igual; só recomeça a contar a partir dos próximos `Cobrado`.
