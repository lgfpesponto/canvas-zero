## O que vou gerar

Uma planilha Excel `MariaGabriela_1016pedidos_atual_vs_snapshot_26-05-2026.xlsx` com **todos os 1016 pedidos** do snapshot do dia 19/05 07:33, comparando snapshot × estado atual.

### Colunas

| Coluna | Conteúdo |
|---|---|
| Nº | `numero` do pedido |
| Cliente | `cliente` |
| Status atual | `status` |
| Qtd atual | quantidade (ou nº de botas para Pronta Entrega) |
| Valor atual | `preco × qtd − desconto` (mesma fórmula da modal) |
| Desconto | `desconto` |
| Justificativa desconto | `desconto_justificativa` (se houver bolinha vermelha/verde) |
| Δ vs snapshot | diferença em R$ (positivo = aumentou, negativo = diminuiu) |
| Editado depois do snapshot | sim/não (`created_at` vs gerado_em do snapshot, ou marcador no histórico) |

### Abas

1. **Todos (1016)** — lista completa, ordenada por número.
2. **Mudaram valor** — só os pedidos com Δ ≠ 0 (provavelmente uma dezena), para você identificar rápido o que somou os −R$ 1.638,00.
3. **Resumo** — totais, contagem por status, soma do Δ.

### Como vou produzir

Script Python que:
1. Lê `pdf_snapshots` id `03bb791d-…-c670cd` para obter os 1016 `order_ids` e os totais salvos.
2. Lê `orders` (em lotes de 200, pelo motivo já discutido) com todos os campos relevantes.
3. Calcula o valor atual com a mesma regra do `getOrderFinalValue` (bota Pronta Entrega usa `extra_detalhes.botas.length`; demais usam `quantidade`).
4. Para o "valor no snapshot por pedido": o snapshot só guarda `order_ids` e o total geral (não guarda valor por pedido). Então o Δ por pedido será inferido como `valor_atual − valor_atual_sem_edicoes_recentes`. Se você quiser o Δ absoluto preciso por pedido, eu posso cruzar com `preco_mudanca_aplicacoes` (registra `valor_total_delta` do ajuste retroativo por pedido) — me confirme se quer essa coluna extra.
5. Salva em `/mnt/documents/MariaGabriela_1016pedidos_atual_vs_snapshot_26-05-2026.xlsx`.

### Não vou alterar nada no banco nem no código

É só leitura + geração de arquivo Excel para download.
