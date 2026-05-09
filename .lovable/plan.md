## Objetivo

Limpar todo o histórico financeiro do saldo dos vendedores (exceto Maria Gabriela) e deixar apenas o estado pedido:

| Vendedor | Recebido | Utilizado | Saldo |
|---|---|---|---|
| Rafael Silva | R$ 11.400 | R$ 0 | R$ 11.400 |
| Denise Garcia Feliciano | R$ 3.415 | R$ 0 | R$ 3.415 |
| Samuel Silva Plácido | R$ 0 | R$ 0 | R$ 0 |
| Larissa Silva | R$ 0 | R$ 0 | R$ 0 |
| Fabiana Silva | R$ 0 | R$ 0 | R$ 0 |
| Maria Gabriela | inalterada | inalterada | inalterada |

## Etapas (apenas dados — sem mudança de código)

Será feito via tool de inserção/migração de dados (não há mudança de schema nem de UI).

### 1. Apagar histórico antigo
Para os 5 vendedores acima (Rafael, Denise, Samuel, Larissa, Fabiana) — Maria Gabriela intocada:

- `DELETE FROM revendedor_baixas_pedido WHERE vendedor IN (...)`
- `DELETE FROM revendedor_saldo_movimentos WHERE vendedor IN (...)`
- `DELETE FROM revendedor_comprovantes WHERE vendedor IN (...)`
- `DELETE FROM financeiro_a_receber WHERE vendedor IN (...)`

Isso zera "Recebido", "Utilizado", "Saldo" e a aba "Comprovantes a entrar / Histórico de comprovantes".

### 2. Inserir o recebimento do Rafael (R$ 11.400)
Inserção direta em 3 tabelas (sem trigger de baixa automática):
- `revendedor_comprovantes`: status `aprovado`, valor 11.400, data hoje, observação "Recebimento inicial — reset financeiro".
- `revendedor_saldo_movimentos`: tipo `entrada_comprovante`, +11.400, saldo_anterior 0 → saldo_posterior 11.400.
- `financeiro_a_receber`: vendedor Rafael, valor 11.400, destinatário "Empresa", tipo `empresa`, data hoje (para também aparecer na aba "A Receber").

### 3. Inserir o recebimento da Denise (R$ 3.415)
Mesma estrutura: comprovante aprovado + movimento de entrada + linha em A Receber. Saldo final 3.415.

### 4. "Quitar historicamente" pedidos Cobrado — Rafael, Samuel, Larissa, Fabiana
Para que os pedidos com status **Cobrado** existentes (Rafael 179, Samuel 31, Larissa 33, Fabiana 10) não consumam o novo saldo via baixa automática, será criada uma `revendedor_baixas_pedido` para cada um (ligada a um movimento `ajuste_admin` com saldo_anterior = saldo_posterior, ou seja, **sem afetar o saldo**). Os pedidos continuam com status "Cobrado" (não vão para "Pago"), mas o sistema enxerga eles como já reconciliados.

Descrição registrada: `[QUITAÇÃO HISTÓRICA — RESET FINANCEIRO 09/05/2026]`.

### 5. Denise — Cobrado preservados para investigação
A Denise tem 5 pedidos Cobrado (R$ 1.795 no total) que ela quer investigar antes de baixar. Como a baixa automática está ativa globalmente, esses pedidos consumiriam imediatamente os R$ 3.415 que vamos inserir, deixando saldo R$ 1.620 — não é o que foi pedido.

**Solução**: aplicar a mesma "quitação histórica" nesses 5 pedidos da Denise (cria `revendedor_baixas_pedido` sem mexer no saldo). Eles ficam visíveis com status Cobrado e marcados como `[QUITAÇÃO HISTÓRICA — INVESTIGAR]` na descrição. Quando a Denise descobrir que algum **não foi pago**, basta o admin master estornar essa baixa via UI ("Estornar baixa") — o pedido volta para a fila de baixa automática normal.

Sem essa etapa, o saldo final da Denise não fica em 3.415.

## Pontos para sua confirmação

1. **Maria Gabriela**: 100% intocada (37 comprovantes, R$ 255.847 saldo).
2. **Storage**: os arquivos PDF/foto dos comprovantes apagados não serão removidos do bucket `financeiro` (custa pouco e mantém auditoria caso precise consultar).
3. **Aba "A Receber"** também será limpa para esses 5 vendedores (afinal, ela espelha os comprovantes).
4. Operação feita em **uma transação** — se algo falhar, nada é alterado.
