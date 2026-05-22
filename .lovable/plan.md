## Reemitir Cobrança Maria Gabriela 19-05-2026 com valores atualizados

Pegar o snapshot original (`pdf_snapshots` id `03bb791d-47fa-40a6-aae7-de2ea5c670cd`, 1016 pedidos / 1191 pares / R$ 354.376,80) e gerar um novo relatório com a situação atual de cada pedido. Esse trabalho é uma **análise + geração de artefatos** (não muda código do portal).

### O que entrego (dois arquivos em `/mnt/documents/`)

1. **PDF** `Cobrança ATUALIZADA - Maria Gabriela - 22-05-2026.pdf`
   - Mesmo cabeçalho/estilo dos PDFs de cobrança (cliente, data, totais).
   - Tabela por pedido: `Nº`, `Vendedor`, `Modelo`, `Tam`, `Status atual`, `Qtd`, `Valor final atual`.
   - Total atualizado no rodapé + comparação com o snapshot (Δ vs R$ 354.376,80).
   - Pedidos agrupados por vendedor (subtotal por vendedor).

2. **Planilha** `Cobrança ATUALIZADA - Maria Gabriela - 22-05-2026.xlsx`
   - Colunas: `numero`, `vendedor`, `cliente`, `modelo`, `tamanho`, `status_atual`, `qtd`, `valor_snapshot`, `valor_atual`, `delta`, `link_portal` (https://portal.7estrivos.com.br/pedido/{id}).
   - Aba extra "Resumo" com total snapshot, total atual, Δ, qtd por status, top 20 maiores deltas.

### Como vou gerar

- Ler `order_ids` do snapshot.
- `SELECT` em `orders` trazendo numero, vendedor, cliente, modelo, tamanho, status, preco, quantidade, desconto, extra_detalhes (para detectar bota-pronta-entrega com nested botas[]).
- Valor final = `preco*quantidade - desconto` (mesma fórmula usada pelos relatórios; bota pronta entrega segue `extra_detalhes.botas[]` se aplicável).
- Gerar PDF com `pdf-lib`/`reportlab` Python (mais simples para tabela longa de 1016 linhas com paginação) e XLSX com `openpyxl`.
- QA visual: converter o PDF em imagens e checar páginas iniciais/médias/finais antes de entregar.

### Resposta no chat

- Resumo dos números (snapshot vs atual, Δ, quebra por status, top vendedores).
- Lista clicável dos N pedidos com maior divergência (com link `https://portal.7estrivos.com.br/pedido/{id}`) direto no chat.
- Anexo dos dois arquivos via `<presentation-artifact>`.

### Observação importante já levantada

Rodando uma checagem rápida: dos 1016 pedidos do snapshot, **0 estão hoje como "Cobrado" ou "Cancelado"** — todos seguem em status ativos. A soma bruta atual deu R$ 357.438,80 (Δ ≈ +R$ 3.062,00 vs snapshot). Vou validar pedido a pedido no relatório.