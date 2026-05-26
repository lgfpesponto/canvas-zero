Gerar um PDF com a lista dos 1016 pedidos da Maria Gabriela (snapshot 19/05), mostrando o valor atual de cada um calculado com `getOrderFinalValue`, e os totais no final.

## O que o PDF terá

**Cabeçalho**
- Título: "Maria Gabriela — 1016 pedidos do snapshot 19/05/2026"
- Data de geração
- Totais resumidos:
  - Valor snapshot (19/05): R$ 354.376,80
  - Valor atual (26/05): R$ 352.738,80
  - Δ real: −R$ 1.638,00

**Tabela (1 linha por pedido)**
Colunas:
1. Nº (numero_unico)
2. Cliente
3. Status atual
4. Qtd
5. Valor atual (R$)

Ordenação: por Nº crescente.

**Rodapé de cada página**
- Página X de Y
- Subtotal corrente (opcional)

**Última página**
- Totais finais (soma da coluna Valor atual deve bater com R$ 352.738,80)
- Contagem por status

## Como será gerado

- Script Python usando reportlab (A4 retrato, fonte Helvetica 8pt para caber bem).
- Lê os 1016 `order_ids` do snapshot `03bb791d-…-c670cd` em `pdf_snapshots`.
- Busca os pedidos em `orders` em lotes de 200.
- Calcula valor atual com a mesma lógica do `getOrderFinalValue` (Pronta Entrega usa `extra_detalhes.botas.length`, demais usam `quantidade`, aplica desconto).
- Salva em `/mnt/documents/MariaGabriela_1016pedidos_valor_atual_26-05-2026.pdf`.
- QA: converte páginas em imagens e inspeciona antes de entregar.

Sem alterações em código do app nem no banco — só leitura + geração de PDF.
